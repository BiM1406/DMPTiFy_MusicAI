# Unit 1 NFR Design Patterns

## Design Status

Answers: A, A, A, A, A, B. Applies to US1.1-US1.4 and U1-NFR-01 through U1-NFR-14. This document specifies implementation and acceptance policies; it does not claim measured runtime compliance.

## P1 - Bounded Dependency Work

| Operation | Budget | Enforcement |
|---|---|---|
| Database connection | 5 seconds | Driver connection timeout and bounded pool acquisition |
| Database query | 2 seconds | Database statement timeout; release connection on failure |
| Local metadata | 2 seconds | Bounded operation; retain ownership of late completions and release handles |
| Cloudinary network metadata/probe | 5 seconds per attempt | SDK/transport timeout and cancellation where supported |
| Pre-stream request | 10 seconds total | Deadline includes lookup, metadata, retry and response setup |

One retry is allowed only for classified transient, read-only metadata failures with 100-300ms jitter and sufficient remaining deadline. Authentication/configuration failures, invalid paths, missing objects, and invalid ranges are not transient. Database queries use their statement budget without an automatic retry. A second network attempt must use the remaining budget if less than 5 seconds.

The deadline ends when response streaming starts. Audio is not terminated merely because playback exceeds 10 seconds. No retry occurs after response headers/bytes have been committed. Client abort or shutdown cancels owned work and closes stream handles. Where an underlying operation cannot be cancelled, a Promise rejection alone must not be treated as resource cleanup; observe its completion and close any resulting resource.

## P2 - Single-Instance Admission and Backpressure

- Database pool maximum: 10 connections with bounded acquisition.
- Per-IP catalog/playlist throttle: configurable 120 requests/minute; media throttle: configurable 600 requests/minute. Counters are local to the single acceptance instance.
- A rejected request returns safe `429` plus `Retry-After`. Normal playback and seeking must pass with these policies enabled.
- Rate limits bound request frequency, not active-stream concurrency. Five concurrent streams are an acceptance minimum, not an implicit global hard cap.
- Use stream backpressure and a bounded 64KiB read buffer per local stream. Never buffer an entire audio object or retain a global audio cache.
- Configure proxy trust only for explicit known deployment hops. Client-supplied forwarding headers cannot select arbitrary throttle identities.

## P3 - Query and Resource Efficiency

Index public identities, membership foreign keys and playlist position. Derive counts with bounded aggregate queries; avoid one query per playlist/song. The full five-song catalog remains uncached at the service layer so acceptance exercises real persistence.

Warm up for 10 seconds, then measure for 60 seconds with 20 catalog workers and 5 audio workers. Record machine/runtime/fixture facts and at least 100 successful samples per measured route; extend collection if necessary. Compute p95 separately for songs, playlists, shallow health, and local media first byte. Targets are 300ms, 300ms, 200ms, and 500ms respectively. Record unexpected errors and `429` separately; do not omit them to make a run pass.

The load harness must respect per-client policy. Use legitimate separately identified clients and pacing, or a documented, isolated performance-test configuration with raised throttle budgets while keeping concurrency fixed. Never trust spoofed forwarding headers or disable production throttling in runtime code. Verify default throttling in separate HTTP tests and disclose any benchmark override in evidence.

For resource evidence, complete 10 identical batches containing completed and aborted streams after warm-up. Sample process RSS and owned file handles/streams at consistent idle points. Require no accumulating owned open handles and final RSS growth <= 64MiB versus warm-up baseline. Record all samples; investigate sustained upward growth even if the final delta narrowly passes.

## P4 - Security Boundary

- Enforce explicit frontend-origin CORS, bounded path/query/Range inputs, and a 16KiB JSON body limit. Reject oversize input before expensive work.
- Use safe validated/generated correlation IDs and structured logs. Redact credentials, signed query strings, tokens, storage paths, and provider payloads.
- Catalog/media routes are explicitly public; later authenticated routes remain guarded. CORS is not authorization.
- Apply secure headers while testing cross-origin audio compatibility. Local HTTP is a documented development exception; deployed/provider traffic requires TLS.
- Resolve a media key only from a known Song. Canonicalize root and candidate realpaths; reject traversal, absolute input and symlink escapes. Read only inside the configured controlled media root.
- Fail startup for invalid selected-provider configuration; never silently fall back.
- Signed redirects use `Cache-Control: private, no-store` and a configurable intended five-minute validity. Provider access control must enforce expiry; URL signing alone is not evidence of expiry. Validate Cloudinary support/account configuration before implementing this contract and report unsupported expiry as a design blocker rather than claiming it works.

## P5 - Health, Configuration and Observability

`GET /api/health` is shallow liveness. Readiness checks PostgreSQL plus configured local-media/provider dependency, returning non-ready `503` when required dependency checks fail. Use bounded probes, concurrent checks and a maximum five-second readiness result cache; document that failure detection may lag by the cache period. Deduplicate simultaneous refreshes; do not serve an expired healthy result indefinitely after probe failure.

Local media readiness checks configured root/readable fixture metadata. Cloudinary readiness uses a lightweight configured adapter capability/probe without downloading audio or exposing signed URLs. Configuration-only validation is distinguished from a real dependency probe.

Structured logs contain timestamp, level, component, correlation ID and safe outcomes. Stream lifecycle logs must distinguish failures before and after headers; after headers, close the response safely rather than attempting a second JSON response. Graceful shutdown stops accepting work, drains bounded in-flight operations and closes pool/stream resources.

## P6 - Resilience Testing and Recovery

RESILIENCY-14 choice B: adopt a lightweight proposed schedule. Run deterministic dependency-failure regression tests on changes in CI. Before Unit 1 acceptance and before a migration/release, exercise backup restore in an isolated database and record elapsed restore time and data timestamp. Repeat the restore exercise monthly while the demo is maintained; repeat targeted fault scenarios after relevant adapter/timeout changes. Infrastructure Design will specify daily backup cadence and retention/encryption mechanics aligned to RPO <=24h and RTO <=4h.

| Scenario | Expected result / evidence |
|---|---|
| PostgreSQL unavailable, then restored | Bounded safe failure, readiness non-ready then recovery after probe/cache interval |
| Known song file removed/unreadable | Safe 503; no filesystem details; unaffected catalog usable |
| Cloudinary timeout | Bounded failure/retry within overall deadline; no local fallback |
| Client abort during stream | Close owned stream promptly; no orphan file handle |
| Corrupt/invalid/multiple Range | 416 when total known; no out-of-bounds bytes or opened stream |
| Restore isolated backup | Migrations/catalog/membership verified through public queries; record recovery time and backup age |

Track exercises, expected/actual results, correlation IDs, corrective actions and rollback notes in GitHub Issues when authorized to publish. This design creates no external issue. Operational chaos execution is not part of this documentation step; mandatory fault tests and restore evidence remain acceptance requirements.

## Requirement and Extension Coverage

| Requirements | Patterns | Verification |
|---|---|---|
| U1-NFR-01, U1-NFR-02 | P2, P3 | Concurrent load, per-route p95 and throttle tests |
| U1-NFR-03 | P1, P2, P3 | Byte/header HTTP tests, aborted streams and resource batches |
| U1-NFR-04 | P5, P6 | Healthy/failed/recovered probes |
| U1-NFR-05 | P6 | Isolated restore report, backup age and recovery time |
| U1-NFR-06, U1-NFR-07 | P4 | Bounds, CORS, traversal/symlink, redaction and redirect-access tests |
| U1-NFR-08, U1-NFR-09 | P1, P4, P5 | Deadlines, cancellation, missing config and provider failure |
| U1-NFR-10 | P3, P6 | Fresh migrations and repeated deterministic seeds |
| U1-NFR-11 | P4 and contract boundary | OpenAPI regeneration/drift and builds |
| U1-NFR-12 | Existing frontend integration design | Keyboard, focus, loading/error/retry and empty-state checks |
| U1-NFR-13 | P4, P5 | Structured log/error redaction |
| U1-NFR-14 | P1-P6 | TDD, lint/build/unit/E2E, Range PBT, dependency scan, SBOM instructions and review |

Security and Resiliency baselines remain blocking for applicable implementation. Partial PBT uses fast-check generators for valid/invalid ranges, normalized bounds and byte-length invariants, automatic shrinking, and saved seed/path for replay. No test result or blanket baseline compliance is claimed before implementation and review.
