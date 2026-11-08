# DMPTiFy CS445 Requirements

## Intent Analysis

- **User request**: complete the existing DMPTiFy prototype as a CS445 System Integration Practices project using five NestJS-centered vertical slices, minimal frontend changes, and lightweight TDD.
- **Request type**: system-wide feature completion and external-system integration.
- **Scope estimate**: multiple components across frontend, backend, persistence, external providers, testing, and deployment support.
- **Complexity**: complex due to authentication, signed payment callbacks, media range delivery, AI integration, persistence, and failure handling.
- **Requirements depth**: comprehensive.

## Product Goal

Turn the current browser-only prototype into an integrated, demonstrable full-stack system while preserving its visual design. The completed project must prove the five CS445 integration pillars through real NestJS APIs, sandbox/provider adapters, deterministic tests, and deploy-ready local documentation.

## Fixed Scope Constraints

1. Preserve the current frontend layout, styling, player, lyrics, AI drawer, profile area, and VIP CTA.
2. Frontend work is limited to a typed API client, wiring existing UI behavior, a minimal Google sign-in modal, and at most three or four small Sidebar/store refinements when integration requires them.
3. Backend implementation remains a modular NestJS application in `server/`; no microservice split is required.
4. Construction is divided into exactly five vertical slices in the order defined below.
5. Each slice uses lightweight RED-GREEN-REFACTOR with Vitest unit/E2E tests through public interfaces.
6. Local/demo mode must work deterministically without paid credentials through explicit fake provider adapters. Production/provider mode must fail fast when required secrets are absent.

## Actors and External Systems

| Actor/System | Responsibility |
|---|---|
| Listener | Discover music, play media, receive AI recommendations, authenticate, and request VIP upgrade |
| DMPTiFy Next.js app | Preserve the current UI and call backend contracts |
| DMPTiFy NestJS API | Own domain rules, persistence, security, streaming, and provider orchestration |
| PostgreSQL | Persist catalog, playlist membership, users, VIP state, payments, and email delivery state |
| Local/Cloudinary media adapter | Resolve media metadata and stream or redirect content safely |
| Google Gemini 2.5 Flash | Analyze mood through function calling |
| Google Identity | Issue an ID token verified by the backend |
| VNPay Sandbox | Create payment redirects and send signed IPN results |
| Resend | Deliver a VIP invoice email after confirmed payment |

## Global Functional Requirements

### FR-G01 - API Conventions

- All backend routes use the `/api` prefix and JSON error envelopes except binary media responses and provider-required callback responses.
- API inputs use DTO validation with explicit type, format, length, and size bounds.
- Public and protected endpoints are declared explicitly; protected endpoints use a deny-by-default JWT guard.

### FR-G02 - Persistence

- PostgreSQL with TypeORM is the single persistence technology.
- Schema changes use migrations; application startup must not rely on automatic schema synchronization outside isolated tests.
- Seed data reproduces the five existing songs and four playlist presentations with real playlist membership.
- Required persistent concepts are Song, Playlist, PlaylistSong, User, PaymentTransaction, and EmailDelivery.

### FR-G03 - Provider Abstraction

- Gemini, Google token verification, VNPay, Resend, and media storage are exposed through narrow provider interfaces.
- Fake adapters are selected explicitly for local demo and E2E environments.
- Provider mode validates required configuration at startup and never silently falls back to fake behavior.

### FR-G04 - Frontend Integration

- A typed API client centralizes base URL, credentials, error mapping, and response types.
- Existing UI components must not contain provider secrets or duplicate backend business rules.
- Existing loading, empty, and interaction states are retained or minimally extended without visual redesign.

### FR-G05 - Error Behavior

- External-call failures return safe, structured errors with a correlation ID.
- Authentication, authorization, payment verification, and provider failures fail closed.
- Email failure after successful payment must not revert the confirmed VIP transaction.

### FR-G06 - Auditability

- Authentication failures, payment state changes, VIP entitlement changes, and email delivery attempts are recorded without tokens, secrets, or sensitive payloads.
- Critical state transitions include actor/provider reference, timestamp, and correlation ID.

## Vertical Slice 1 - Core Songs, Playlists, and Audio Streaming

### Functional Requirements

- `GET /api/songs` returns persisted catalog metadata usable by the existing song cards and player.
- `GET /api/playlists` returns persisted playlists and their song membership/counts.
- `GET /api/audio/:songId` resolves the song through a media adapter.
- Local media supports `Range` requests and returns:
  - `206 Partial Content` with valid `Content-Range`, `Accept-Ranges`, `Content-Length`, and media content type for satisfiable ranges.
  - `416 Range Not Satisfiable` with the correct total length for invalid or unsatisfiable ranges.
  - a full response when no range is requested, subject to the approved implementation design.
- Local storage is the default dev/test adapter; Cloudinary is enabled by environment configuration.
- The existing frontend catalog and playlist UI read from the API; the current playback UX remains unchanged.

### Acceptance Criteria

- Seeded songs/playlists are retrievable through E2E tests.
- Range parsing covers start-end, open-ended, suffix, malformed, and unsatisfiable inputs.
- A real HTTP E2E test verifies byte length and headers for a partial audio response.
- Media-provider failure returns a safe error and does not expose file-system or provider details.

## Vertical Slice 2 - Gemini Mood Analysis and Recommendations

### Functional Requirements

- `POST /api/ai/analyze-mood` accepts a bounded natural-language message.
- Gemini 2.5 Flash function calling returns a validated structure containing:
  - `mood` from the supported mood vocabulary.
  - `targetBpm` within an approved numeric range.
  - `replyText` suitable for display.
  - recommended persisted songs selected from the real catalog.
- Recommendation filtering uses catalog data; Gemini must not invent song IDs accepted by the API.
- A fake deterministic Gemini adapter supports local demo and tests.
- `AiChatDrawer` replaces its keyword/setTimeout simulation with the API response while retaining its current appearance.

### Acceptance Criteria

- Unit tests verify schema validation, unsupported mood handling, BPM bounds, and unknown song rejection.
- E2E tests verify a deterministic fake-provider response maps to existing catalog songs.
- Provider timeout, quota, invalid output, and unavailable cases return safe errors with correlation IDs.
- User input and provider output are length-bounded and never logged verbatim when they may contain sensitive content.

## Vertical Slice 3 - Google OAuth 2.0 and JWT Session

### Functional Requirements

- `POST /api/auth/google` accepts a Google ID token, verifies signature, issuer, audience, expiration, and required identity claims, then upserts a user.
- The backend issues a short-lived access JWT in an `HttpOnly`, `Secure` in provider/deployed mode, and `SameSite` cookie.
- The endpoint returns safe user information including VIP status, never the JWT or provider token.
- `GET /api/auth/me` returns the authenticated user/VIP view.
- `POST /api/auth/logout` invalidates or expires the session cookie.
- CORS uses an explicit frontend origin allowlist and credentials support.
- A minimal Google sign-in modal may be added; the existing profile area reflects authenticated user/VIP state.

### Acceptance Criteria

- Unit tests cover token-verifier success and invalid issuer, audience, expiry, and signature behavior through the provider boundary.
- E2E tests verify cookie attributes, protected-route rejection, authenticated `/auth/me`, and logout.
- Authentication endpoints are rate limited and never log ID tokens or JWTs.

## Vertical Slice 4 - VNPay Sandbox VIP Payment

### Functional Requirements

- `POST /api/payment/vnpay-create` requires authentication and creates a pending payment for exactly `49,000 VND` using server-controlled amount and order information.
- VNPay parameters are canonicalized, encoded, sorted, and signed with HMAC-SHA512 using a server-side secret.
- The response returns the sandbox payment URL and a stable transaction reference.
- `GET /api/payment/vnpay-ipn` is public to VNPay but must verify signature, amount, transaction reference, response codes, and current state before mutation.
- Confirmed payment atomically marks the transaction successful and grants VIP entitlement.
- Duplicate or replayed successful IPNs are idempotent and cannot grant VIP twice.
- Invalid signature, mismatched amount, missing transaction, or invalid state never upgrades the user.
- The existing VIP CTA initiates payment and uses the existing visual language.

### Acceptance Criteria

- Example-based tests pin VNPay canonicalization and known HMAC signatures.
- Partial PBT verifies signature/canonicalization invariants over domain-valid parameter maps with reproducible seeds.
- E2E tests cover create, valid IPN, invalid signature, amount mismatch, duplicate IPN, and concurrent/replayed callback behavior.
- Payment/VIP changes are auditable and transactional.

## Vertical Slice 5 - Resend VIP Invoice Email

### Functional Requirements

- A successful, committed VIP payment creates one invoice-email delivery request.
- Resend sends an electronic invoice to the verified user email using server-side templates and provider configuration.
- Email sending is idempotent per payment transaction.
- Provider failure records a retryable failed delivery without rolling back payment or VIP entitlement.
- A fake Resend adapter supports deterministic E2E tests.
- Retried delivery uses bounded attempts/backoff and does not produce duplicate invoices.

### Acceptance Criteria

- Unit tests verify invoice mapping, idempotency key, and retry classification.
- E2E tests verify one successful payment creates one email delivery and duplicate IPNs do not duplicate email.
- Failure tests prove VIP remains active when Resend is unavailable.

## Non-Functional Requirements

### NFR-01 - Security

- Apply the enabled AI-DLC Security Baseline to applicable implementation stages.
- Production/provider traffic and persistence require TLS; production data/backups require encryption at rest. Local development exceptions must be explicit and must not weaken provider configuration.
- Use secure headers, restricted CORS, request body limits, global validation, safe global exception handling, and rate limiting.
- Secrets live only in validated environment configuration; `.env.example` contains names and safe placeholders only.
- Authentication, payment, and entitlement logic stay in dedicated NestJS modules.
- Lockfiles remain committed; CI includes dependency scanning and SBOM generation instructions.
- Admin/password/MFA requirements are N/A unless a password-based or administrative actor is later introduced; Google-only listener authentication remains in scope.

### NFR-02 - Reliability and Resiliency

- Workload criticality: payment/auth are High for demo integrity; catalog/streaming/AI are Medium; invoice email is Low because it may retry after payment.
- Selected recovery objectives: RTO up to 4 hours and RPO up to 24 hours using Backup & Restore.
- Automated PostgreSQL backup instructions, retention, encryption requirements, and a restore-validation procedure are required.
- All database and provider calls use explicit timeouts; retries apply only to safe/idempotent operations with bounded backoff.
- Payment IPN and invoice dispatch are idempotent.
- `GET /api/health` provides shallow health; a readiness endpoint verifies required persistence and reports provider readiness without leaking secrets.
- Structured logs include timestamp, level, correlation ID, component, and safe message.
- Local/sandbox single-instance is the acceptance target. Production multi-zone, auto-scaling, centralized monitoring, and multi-region are documented future requirements, not implemented acceptance criteria.

### NFR-03 - Change and Incident Management

- GitHub Issues and pull requests provide lightweight change records.
- Each change includes quality results, approval, and rollback notes.
- GitHub Actions runs lint, build, unit, E2E, partial PBT, dependency scan, and artifact checks.
- Sandbox deployment may be direct/in-place with health verification.
- Rollback redeploys the previous pinned artifact; TypeORM migrations use forward-fix plus backup-before-migration rather than destructive automatic rollback.
- Incident handling uses a GitHub issue, correlation-ID evidence, restoration steps, a short post-mortem, and tracked corrective actions.

### NFR-04 - Testability and TDD

- Each slice proceeds one observable behavior at a time: RED test, minimal GREEN implementation, then REFACTOR.
- Tests use public HTTP/module interfaces and fake only external-system boundaries.
- Vitest is the NestJS unit/E2E runner; Supertest drives HTTP behavior.
- `fast-check` is the selected PBT framework in partial enforcement mode.
- Mandatory partial PBT rules are PBT-02, PBT-03, PBT-07, PBT-08, and PBT-09.
- PBT is limited initially to HTTP Range parsing/formatting and VNPay parameter/signature invariants; example-based tests remain mandatory for business scenarios.
- Seeds and shrunk counterexamples must be reproducible in CI.

### NFR-05 - Maintainability

- Modules expose narrow interfaces and isolate providers through dependency injection.
- Frontend and backend share or generate compatible contract types without importing server internals into the frontend.
- README must distinguish As-Is implementation, local setup, sandbox credentials, and target/future architecture.
- No unrelated UI redesign or speculative infrastructure is introduced.

### NFR-06 - Deployment Support

- Provide `.env.example`, Docker Compose for PostgreSQL, migrations, seeds, and repeatable root/server scripts.
- Provide local instructions for fake mode and sandbox/provider mode.
- GitHub Actions is the selected CI/CD tooling.
- The accepted deployment target is local/demo-first and deploy-ready; public cloud deployment is optional and outside mandatory acceptance.

## Data and Consistency Requirements

- Payment amount and VIP entitlement are server-owned values.
- PaymentTransaction has a unique transaction reference and provider reference where available.
- VIP activation and successful payment state update occur in one database transaction.
- EmailDelivery is uniquely associated with the successful payment to enforce at-most-one invoice intent.
- Playlist song counts derive from membership rather than display-only values.
- User email used for invoices comes from the verified Google identity record.

## Explicit Out of Scope

- Frontend visual redesign, new dashboard, or native mobile application.
- Microservices, event broker, Kubernetes, multi-region deployment, or production autoscaling.
- Password registration, administrator portal, RBAC beyond authenticated listener access, or MFA UI.
- Recurring subscription renewal, refunds, chargebacks, or production VNPay settlement.
- AI model training, vector search, or personalized recommendation history.
- Full production observability platform and chaos/DR execution; scenarios and future guidance may be documented.

## Vertical Slice Traceability

| Slice | Primary integration pillar | Key APIs | Main persistence | Primary quality evidence |
|---|---|---|---|---|
| 1 | Media and catalog | songs, playlists, audio range | Song, Playlist, PlaylistSong | Range unit/PBT plus streaming E2E |
| 2 | Gemini AI | ai/analyze-mood | Reads Song catalog | Provider contract unit plus API E2E |
| 3 | Google Identity | auth/google, auth/me, auth/logout | User | Token boundary unit plus cookie/guard E2E |
| 4 | VNPay | payment/vnpay-create, payment/vnpay-ipn | PaymentTransaction, User VIP | HMAC/PBT plus idempotency E2E |
| 5 | Resend | internal post-payment workflow | EmailDelivery | Idempotency/retry unit plus payment-to-email E2E |

## Success Criteria

The project is complete when all five slices are demonstrable through the preserved frontend or documented API flow, provider/fake modes are explicit, migrations and local setup are repeatable, every slice passes its TDD quality gates, payment and authentication fail closed, and the combined root/server CI pipeline passes without manual code changes.

## Extension Compliance at Requirements Stage

### Security Baseline

- **Captured and applicable**: SECURITY-01, 03, 04, 05, 08, 09, 10, 11, 12 session subset, 13 data integrity subset, 14 event requirements, and 15.
- **Deferred to design/implementation verification**: configuration and code evidence for all captured rules.
- **N/A for mandatory local/demo acceptance**: SECURITY-02, 06, and 07 where no gateway, cloud IAM, or cloud network is deployed.
- **No blocking requirements finding**: applicable security constraints are represented and must be verified at later stages.

### Resiliency Baseline

- **Captured**: criticality, RTO/RPO, backup/restore, lightweight change/incident process, GitHub Actions, rollback, local topology, health checks, timeout/retry, idempotency, and graceful degradation.
- **Deferred user decision**: resiliency testing approach is intentionally scheduled for NFR Design as permitted by RESILIENCY-14.
- **N/A for mandatory local/demo acceptance**: production multi-zone, autoscaling, multi-region, centralized cloud monitoring, and chaos execution.
- **No blocking requirements finding**: all decisions required before finalizing Requirements are recorded.

### Property-Based Testing

- **Mode**: Partial.
- **Enforced**: PBT-02, PBT-03, PBT-07, PBT-08, and PBT-09.
- **Framework**: fast-check integrated with Vitest.
- **Initial targets**: HTTP Range logic and VNPay canonicalization/signature invariants.
- **No blocking requirements finding**: framework, scope, generator quality, shrinking, and seed reproducibility are specified.
