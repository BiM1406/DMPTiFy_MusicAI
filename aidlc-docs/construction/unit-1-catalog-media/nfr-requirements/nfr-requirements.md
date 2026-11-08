# Unit 1 NFR Requirements

## Scope and Status

Applies to US1.1-US1.4 on one local/sandbox NestJS instance with PostgreSQL, five seeded songs, and four playlists. These are acceptance targets, not measurements already achieved. Answers Q1-Q8 are A. Production autoscaling, multi-zone operation, and a contractual uptime SLA remain outside acceptance scope.

## Measurable Requirements

| ID | Requirement | Acceptance evidence |
|---|---|---|
| U1-NFR-01 | Sustain 20 concurrent catalog/playlist requests and 5 concurrent local audio streams without unexpected errors or unbounded resource growth | Repeatable local load run; record hardware, OS, Node version, fixture sizes, concurrency, errors, and duration |
| U1-NFR-02 | Under the approved load, catalog/playlist p95 <= 300 ms, local media headers/first byte p95 <= 500 ms, shallow health p95 <= 200 ms | Warm-up followed by measured requests; report sample counts and p95 per route; exclude deliberate negative cases from successful latency samples |
| U1-NFR-03 | Stream bounded ranges without loading whole files into memory; release streams on completion, cancellation, and failure | Real HTTP byte/header checks, aborted-request regression test, and resource measurements across repeated stream batches |
| U1-NFR-04 | Separate shallow liveness from dependency readiness; unavailable PostgreSQL or required configured media dependency causes non-ready status | Healthy/unhealthy readiness E2E; safe responses contain no secrets |
| U1-NFR-05 | Retain RTO <= 4 hours and RPO <= 24 hours through backup and restore | Backup cadence/retention, encryption, restore-validation instructions and recorded restore exercise; objectives are not claimed achieved before evidence |
| U1-NFR-06 | Bound inputs, validate DTOs, apply secure headers, explicit CORS and body limits; return safe errors with correlation IDs | HTTP negative tests for invalid IDs/headers/body/origin and error redaction |
| U1-NFR-07 | Resolve media only through server-owned keys with path containment; keep secrets in validated environment config; use signed Cloudinary delivery | Traversal/escape tests, missing-config startup tests, signed-redirect adapter tests and redacted logs |
| U1-NFR-08 | Use explicit timeouts for database/provider metadata operations and bounded retry only for safe transient operations | Timeout/failure tests; exact budgets and retry schedule finalized in NFR Design |
| U1-NFR-09 | Provider mode fails fast without required configuration and never silently switches to local mode | Bootstrap and provider-unavailable tests |
| U1-NFR-10 | Fresh migrations and repeated seeds produce deterministic catalog/membership without duplication | PostgreSQL migration/seed integration evidence |
| U1-NFR-11 | Keep API contracts compatible without frontend imports of backend internals | OpenAPI generation/type checking and frontend build |
| U1-NFR-12 | Added loading/error/retry controls remain keyboard accessible, visibly focused, and use safe Vietnamese text while preserving the UI | Component/browser checks for loading, error, retry, empty playlist and normal playback |
| U1-NFR-13 | Structured logs contain timestamp, level, component and correlation ID without secrets, raw paths, stack traces in client output, or sensitive payloads | Error/log redaction tests and review evidence |
| U1-NFR-14 | Run lint, type/build, unit, E2E and Range PBT; resolve blocking quality findings | Per-slice evidence and Standards/Spec review; dependency scan and SBOM generation instructions |

## Verification Protocol

Record the acceptance machine and runtime before load measurements. Exercise catalog and streaming concurrently using documented fixtures; report warm-up separately. A fast unit test alone cannot prove latency, streaming resource efficiency, or recovery objectives. Exact load-run duration, sample count, timeout budgets, resource threshold, backup retention, and resilience scenarios are implementation design decisions to make concrete in NFR/Infrastructure Design.

Tests follow one public behavior at a time through RED, GREEN, then REFACTOR. Use real PostgreSQL and local files for relevant integration paths; fake external provider boundaries only. Range example tests cover full, closed, open-ended, suffix, malformed, multi-range, and unsatisfiable requests. Properties use valid generators, shrinking, and replayable seed/path output.

## Extension Traceability

| Extension | Unit 1 coverage | Remaining evidence |
|---|---|---|
| Security Baseline, full applicable scope | U1-NFR-06/07/09/11/13/14 | Concrete patterns, code, scan and review evidence |
| Resiliency Baseline, full applicable scope | U1-NFR-01/03/04/05/08/09/10/13 | NFR Design resilience testing decision, budgets, recovery and fault tests |
| Partial PBT: PBT-02/03/07/08/09 | U1-NFR-03/14, Range invariants | fast-check generators, shrunk counterexamples, reproducible seeds and CI evidence |

Inherited project baselines remain authoritative. No exemption is introduced here. Cloud infrastructure controls remain conditional on a later deployment choice.

## Story Traceability

- US1.1: latency, validation, compatible contracts, safe catalog retry.
- US1.2: deterministic memberships, counts and accessible selection/empty state.
- US1.3: correct bytes, bounded streaming, cancellation cleanup, media security and latency.
- US1.4: repeatable configuration, migrations/seeds, provider failures, recovery and test evidence.

## Approval Status

Approved by Nguyễn Tuấn Đạt with response "a" (choice A). Proceed to NFR Design. No performance or runtime compliance is claimed at this documentation stage.
