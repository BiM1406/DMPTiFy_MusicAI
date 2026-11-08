# Application Design Plan

## Objective

Define high-level components, public methods, service orchestration, and dependency direction for a single NestJS modular monolith plus the existing Next.js frontend. Detailed algorithms and business rules remain deferred to per-slice Functional Design.

## Fixed Design Constraints

- Exactly five approved vertical slices.
- One NestJS application in `server/`; no microservice split.
- PostgreSQL + TypeORM migrations.
- Existing frontend design remains intact.
- External systems use narrow provider ports with fake and real adapters.
- Security, Resiliency, and partial PBT requirements remain blocking where applicable.

## Design Questions

### Question 1 - NestJS Component Organization

How should backend components be organized?

A) Feature modules per slice plus a small shared platform layer for config, database, HTTP bootstrap, logging, errors, and health (recommended)

B) Traditional horizontal layers shared by all features: controllers, services, repositories, providers

C) Full Clean Architecture package hierarchy with domain/application/infrastructure folders for every feature

D) Other - describe after `[Answer]:`

[Answer]: A

### Question 2 - Frontend/Backend Contract Source

What should be the source of truth for API contracts?

A) Nest DTOs produce OpenAPI; generate or derive typed frontend contracts/client from the schema while keeping runtime validation on the server (recommended)

B) Create a new npm workspace package containing hand-written shared TypeScript interfaces

C) Maintain separate frontend and backend types manually

D) Other - describe after `[Answer]:`

[Answer]: A

### Question 3 - Cloudinary Media Behavior

How should `GET /api/audio/:songId` behave when Cloudinary mode is enabled?

A) Return a short-lived signed Cloudinary/CDN redirect while Cloudinary handles HTTP Range; local adapter streams `206` directly (recommended)

B) Backend proxies every Cloudinary byte through NestJS and implements Range itself

C) Return the permanent public Cloudinary URL in song metadata and bypass the audio endpoint

D) Other - describe after `[Answer]:`

[Answer]: A

### Question 4 - Server-Side Session Invalidation

How should logout invalidate a short-lived JWT session?

A) Persist an AuthSession record referenced by JWT `sid`; guard checks active/expiry state and logout revokes that session (recommended)

B) Use a `sessionVersion` field on User and invalidate all sessions when it increments

C) Only expire the browser cookie and rely on short JWT lifetime; no server-side revocation

D) Other - describe after `[Answer]:`

[Answer]: A

### Question 5 - Payment-to-Email Coordination

How should confirmed payment trigger invoice delivery without coupling email failure to VIP activation?

A) Transactional outbox: payment transaction writes one invoice event in the same DB transaction; an in-process worker dispatches/retries via Resend (recommended)

B) Call Resend synchronously after the payment transaction commits and record delivery result

C) Add an external queue/broker such as RabbitMQ or SQS

D) Other - describe after `[Answer]:`

[Answer]: A

## Execution Checklist

- [x] Validate every design answer and resolve contradictions.
- [x] Confirm module boundaries and dependency direction.
- [x] Generate `aidlc-docs/inception/application-design/components.md`.
- [x] Generate `aidlc-docs/inception/application-design/component-methods.md`.
- [x] Generate `aidlc-docs/inception/application-design/services.md`.
- [x] Generate `aidlc-docs/inception/application-design/component-dependency.md`.
- [x] Generate consolidated `aidlc-docs/inception/application-design/application-design.md`.
- [x] Verify every approved slice maps to components, methods, services, and dependencies.
- [x] Verify frontend changes remain within the approved minimal scope.
- [x] Verify Security, Resiliency, and partial PBT design constraints are represented.
- [x] Validate Mermaid/Markdown and update all checkboxes immediately.

## Mandatory Artifacts

- `components.md`
- `component-methods.md`
- `services.md`
- `component-dependency.md`
- `application-design.md`

## Status

Answers `A, A, A, A, A` are validated and treated as plan approval. All artifacts and content validation are complete.
