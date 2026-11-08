# Consolidated Application Design

## Decision Summary

| Decision | Selected design |
|---|---|
| Backend architecture | NestJS modular monolith with feature modules and a small shared platform layer |
| Contract source | Server DTO runtime validation plus OpenAPI-derived frontend types/client |
| Cloud media | Local adapter streams full/partial content; Cloudinary adapter returns short-lived signed redirect |
| Session revocation | Persisted AuthSession referenced by JWT `sid` and checked by the guard |
| Payment-to-email | Transactional outbox with in-process worker and Resend/fake adapters |

## Module Map

- **Shared platform**: application factory, typed configuration, database, OpenAPI, validation, security middleware, logging, safe errors, and health/readiness.
- **CatalogModule**: persisted songs, playlists, membership, and catalog query contracts.
- **MediaModule**: Range deep module plus local/Cloudinary media delivery.
- **AiModule**: Gemini/fake mood analysis and catalog-backed recommendations.
- **AuthModule**: Google/fake identity verification, User/AuthSession, JWT guard, current user, and logout.
- **PaymentModule**: VNPay URL/signature/IPN, PaymentTransaction, atomic VIP activation, and outbox write.
- **NotificationModule**: OutboxEvent, EmailDelivery, invoice worker, Resend/fake delivery, and retry state.
- **Frontend integration**: one OpenAPI-typed API client wired into the existing catalog/player, AI drawer, profile/login, and VIP CTA.

## Five-Slice Mapping

| Slice | Owning modules | Frontend seam | Key deep/testable module |
|---|---|---|---|
| 1 | CatalogModule, MediaModule, shared foundation | Catalog, playlists, audio URL | RangeParser |
| 2 | AiModule plus CatalogQuery | Existing AiChatDrawer | Provider output validator/recommendation resolver |
| 3 | AuthModule | Minimal Google modal and existing profile | SessionService/guard |
| 4 | PaymentModule | Existing VIP CTA/profile refresh | VnPayCanonicalizer and idempotent IPN transition |
| 5 | NotificationModule | No new primary UI | Outbox claim/delivery state machine |

## Core Data Model Ownership

- Slice 1: Song, Playlist, PlaylistSong.
- Slice 3: User, AuthSession.
- Slice 4: PaymentTransaction and atomic VIP mutation.
- Slice 5: OutboxEvent, EmailDelivery.
- Slice 2 introduces no new mandatory persistent entity; analysis reads Catalog data and provider configuration.

Detailed fields, constraints, indexes, migration order, and state machines are deferred to Units Generation and per-unit Functional Design.

## Security Design

- DTO validation, payload bounds, safe error responses, restricted credentialed CORS, secure headers, and rate limiting are platform defaults.
- JWT validation covers signature, expiry, issuer/audience as designed, plus active server-side AuthSession.
- Google/VNPay/Gemini/Resend/Cloudinary secrets remain only in validated backend configuration.
- Auth and Payment are dedicated modules; IPN fails closed and payment values are server-owned.
- Structured logs redact tokens, provider payload secrets, signing keys, and sensitive message content.
- Local HTTP/database exceptions are development-only; deployed/provider mode requires TLS and approved encrypted persistence.

## Resiliency Design

- Explicit provider/database timeouts and classified bounded retry.
- Payment IPN and email dispatch are idempotent.
- Transactional outbox prevents email outage from corrupting payment/VIP state.
- Health/readiness and structured correlation logging support the lightweight incident process.
- Backup/restore with RTO 4 hours and RPO 24 hours is the accepted recovery posture.
- Local single-instance is mandatory acceptance; production multi-zone/central monitoring remain future posture.
- RESILIENCY-14 testing approach remains a required user decision during NFR Design.

## Property-Based Testing Design

- `fast-check` integrates with Vitest in partial enforcement mode.
- RangeParser properties cover valid bounds, length/header invariants, invalid-range rejection, shrinking, and seed replay.
- VnPayCanonicalizer properties cover deterministic ordering, encoding/signature invariants, domain-specific generators, shrinking, and seed replay.
- Concrete business examples remain alongside PBT and become regression tests when PBT discovers counterexamples.

## Minimal Frontend Change Verification

- No page redesign, routing expansion, dashboard, or new visual system.
- API client and state hydration replace mock data paths.
- AI drawer markup remains while its data source changes.
- One minimal sign-in modal is permitted.
- Existing profile/VIP CTA is wired to session/payment state.
- Player remains the audio owner and Karaoke continues to use the current seek flow.

## Artifact Index

- `components.md` - component ownership and responsibilities.
- `component-methods.md` - design-level interfaces and signatures.
- `services.md` - orchestration and transaction boundaries.
- `component-dependency.md` - dependency direction, data ownership, and forbidden coupling.

## Extension Compliance at Application Design

### Security

- Applicable SECURITY-03, 04, 05, 08, 09, 10, 11, 12 session subset, 13 integrity subset, 14 event requirements, and 15 have explicit component/design homes.
- SECURITY-01 is specified for deployed persistence/transport and explicitly scoped for local development exceptions.
- SECURITY-02, 06, and 07 remain N/A until network intermediary, IAM, or cloud network infrastructure is introduced.
- No blocking design finding.

### Resiliency

- Critical dependency maps, health, timeouts, bounded retry, idempotency, outbox isolation, backup/restore, and incident evidence are represented.
- Local-demo topology keeps multi-zone, autoscaling, and multi-region implementation N/A for mandatory acceptance.
- RESILIENCY-14 remains scheduled for its required NFR Design question.
- No blocking design finding.

### Property-Based Testing

- PBT-02, 03, 07, 08, and 09 map to RangeParser and VnPayCanonicalizer.
- fast-check/Vitest, reusable domain generators, shrinking, seed replay, and example-test complement are specified.
- No blocking design finding.
