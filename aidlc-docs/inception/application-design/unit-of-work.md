# Units of Work

## Decomposition Model

DMPTiFy remains one deployable NestJS modular monolith. The five units are sequential vertical development increments, not microservices. Each unit must leave the frontend and backend buildable, satisfy its public behavior, and pass its quality/review gates before the next unit begins.

## Unit 1 - Catalog, Playlists, and Audio Streaming Foundation

### Business Outcome

The existing frontend displays persisted songs/playlists and streams/seeks real media through a stable backend API.

### Scope and Ownership

- Owns the minimum shared platform foundation: application factory, typed config, validation, safe errors, CORS/security middleware, correlation logging, OpenAPI, health/readiness, PostgreSQL/TypeORM, Docker Compose, migrations, seeds, and initial GitHub Actions skeleton.
- Owns CatalogModule and MediaModule.
- Owns Song, Playlist, PlaylistSong schema and repositories.
- Owns local media Range behavior and Cloudinary signed-redirect adapter.
- Owns the initial OpenAPI-derived frontend client and catalog/player wiring.

### Inputs

- Approved five-song/four-playlist fixtures and static media.
- Local media root or Cloudinary provider configuration.
- Optional HTTP Range header.
- Catalog/search/playlist requests from the existing UI.

### Outputs

- Persisted catalog/playlist API projections.
- Local full/partial stream, `416`, or Cloudinary redirect delivery result.
- Repeatable migration/seed/local-stack commands.
- Shared platform contracts available to later units.

### Primary Components

- Shared platform, CatalogModule, MediaModule, typed frontend API client.
- RangeParser and MediaStoragePort with local/Cloudinary adapters.

### TDD Behaviors

- Catalog/playlist retrieval and membership-derived counts.
- Range parsing and response headers/body for valid, open, suffix, malformed, and unsatisfiable ranges.
- Provider-mode fail-fast and deterministic local mode.
- fast-check properties for Range invariants, shrinking, and seed replay.
- Production-equivalent application bootstrap E2E.

### Definition of Done

- US1.1-US1.4 accepted.
- Migrations and seeds work from a fresh PostgreSQL database.
- Existing catalog, playlist, player, seek, and karaoke behavior use backend data without redesign.
- Root/server lint, type/build, unit, E2E, and Range PBT pass.
- Security/Resiliency/PBT checks and Standards/Spec review have no blocking finding.
- Setup and contract documentation are updated.

## Unit 2 - Gemini Mood Analysis and Catalog Recommendations

### Business Outcome

The existing AI drawer sends listener text to NestJS and receives validated Gemini/fake analysis with playable persisted recommendations.

### Scope and Ownership

- Owns AiModule, MoodAnalysisPort, Gemini adapter, fake adapter, provider-output validator, and recommendation orchestration.
- Extends typed config/OpenAPI/client only for the approved AI contract.
- Replaces local keyword/setTimeout data flow while preserving drawer markup and playback interaction.

### Inputs

- Bounded listener text.
- Unit 1 CatalogQuery and persisted songs.
- Fake/provider configuration and Gemini credentials in provider mode.

### Outputs

- Supported mood, bounded target BPM, safe reply text, and persisted Song projections.
- Safe structured provider errors with correlation ID.

### Primary Components

- AiModule, MoodAnalysisPort, MoodOutputValidator, CatalogQuery dependency, AI API client method.

### TDD Behaviors

- Valid analysis and deterministic fake response.
- Invalid/missing function output, unsupported mood, BPM bounds, unknown song IDs, oversized input, timeout, quota, and provider-unavailable cases.
- No secret/prompt leakage in safe errors or logs.

### Definition of Done

- US2.1-US2.3 accepted.
- AiChatDrawer uses the backend response and existing player actions.
- Provider and fake modes are explicit; provider mode fails fast without secrets.
- Unit/server/root quality gates and Standards/Spec review pass.

## Unit 3 - Google OAuth and Revocable JWT Session

### Business Outcome

A listener signs in with Google, receives a secure server-managed session, sees identity/VIP status, and can log out.

### Scope and Ownership

- Owns AuthModule, User and AuthSession schemas/repositories, GoogleTokenVerifierPort, JWT/session services, auth guard, cookie policy, current-user and logout endpoints.
- Owns minimal Google sign-in modal and existing profile integration.
- Extends shared rate limiting, CORS, security event logging, and provider config only as required for auth.

### Inputs

- Google ID token or deterministic fake identity token in test/demo mode.
- Request/cookie context and configured Google audience/issuer.

### Outputs

- Safe current-user/VIP projection.
- Secure HttpOnly/SameSite access cookie with JWT `sub` and `sid`.
- Revoked AuthSession and expired cookie on logout.

### Primary Components

- AuthModule, GoogleTokenVerifierPort, SessionService, AuthSessionRepository, JWT guard, frontend auth/profile seam.

### TDD Behaviors

- Valid login/user upsert/session issuance.
- Invalid signature, issuer, audience, expiry, missing claims, revoked session, expired JWT, logout, rate limit, and restricted CORS.
- E2E uses production-equivalent bootstrap and verifies cookie attributes.

### Definition of Done

- US3.1-US3.3 accepted.
- AuthSession supports server-side revocation.
- Existing profile/VIP UI reflects authenticated state without redesign.
- Security, root/server quality, and Standards/Spec review pass.

## Unit 4 - VNPay Sandbox VIP Payment

### Business Outcome

An authenticated listener starts a fixed-price VNPay Sandbox payment and receives VIP only after a valid, idempotently reconciled IPN.

### Scope and Ownership

- Owns PaymentModule, PaymentTransaction schema/repository, VnPayPort, canonicalization/HMAC module, create-payment/IPN endpoints, atomic VIP mutation, and OutboxWriterPort.
- Introduces OutboxEvent table/write contract required by Unit 5, but does not send email.
- Wires the existing VIP CTA and authenticated profile refresh.

### Inputs

- Authenticated principal.
- Server-owned VIP package/49,000 VND amount.
- VNPay Sandbox configuration and signed IPN query.

### Outputs

- Signed sandbox URL and stable transaction reference.
- Idempotent provider-compatible IPN result.
- Atomic PaymentTransaction success, User VIP activation, and one persisted `VipPaymentConfirmed` outbox event.

### Primary Components

- PaymentModule, VnPayPort, VnPayCanonicalizer, PaymentRepository, OutboxWriterPort, VIP CTA seam.

### TDD Behaviors

- Known canonicalization/signature examples.
- Create payment auth/server-owned amount.
- Valid success, invalid signature, amount mismatch, missing transaction, invalid state, duplicate and concurrent replay.
- fast-check properties for parameter generators, deterministic canonicalization/signature invariants, shrinking, and seed replay.
- Audit logs exclude secrets while retaining correlation/transaction references.

### Definition of Done

- US4.1-US4.3 accepted.
- Payment/VIP/outbox transaction is atomic and replay safe.
- Existing VIP CTA initiates payment without UI redesign.
- Unit/server/root quality, security/PBT, and Standards/Spec review pass.

## Unit 5 - Resend VIP Invoice Delivery

### Business Outcome

A confirmed VIP payment produces exactly one invoice intent; Resend/fake delivery may retry independently without reverting VIP.

### Scope and Ownership

- Owns NotificationModule, OutboxEvent processing ownership, EmailDelivery schema/repository, outbox worker, InvoiceEmailPort, Resend adapter, fake adapter, bounded retry/terminal state.
- Consumes Unit 4 committed event only; no synchronous PaymentModule callback.
- Adds operator-visible safe delivery evidence; no new primary frontend screen.

### Inputs

- Persisted `VipPaymentConfirmed` outbox event containing verified email/payment facts.
- Fake/provider configuration and Resend credentials in provider mode.

### Outputs

- Exactly one EmailDelivery intent per payment.
- Sent, retryable-failed, or terminal-failed delivery state.
- Safe logs/metrics for operator diagnosis.

### Primary Components

- NotificationModule, OutboxWorker, InvoiceService, InvoiceEmailPort, OutboxRepository, EmailDeliveryRepository.

### TDD Behaviors

- Payment event to one delivery intent.
- Duplicate event/IPN cannot duplicate invoice.
- Fake success, retryable failure, bounded retry, permanent failure, and provider-mode fail-fast.
- VIP remains active on every email failure path.

### Definition of Done

- US5.1-US5.2 accepted.
- Outbox/delivery locking and idempotency prevent duplicates.
- Combined five-slice listener journey passes in fake mode.
- Unit/server/root quality, resilience, and Standards/Spec review pass.
- Final Build and Test instructions can run from a fresh checkout/database.

## Global Completion Rule

No unit is complete with only controller compilation or unit tests. Its backend behavior, approved frontend seam, schema/config changes, documentation, TDD tests, extension compliance, and review findings must all reach GREEN/resolved status before advancing.
