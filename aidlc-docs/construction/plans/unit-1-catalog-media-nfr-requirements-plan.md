# Unit 1 NFR Requirements Plan

## Unit

**Catalog, Playlists, and Audio Streaming Foundation**  
**Stories**: US1.1-US1.4

## Objective

Convert the approved Unit 1 functional behavior into measurable scalability, performance, availability, security, reliability, maintainability, usability, and technology requirements. Keep the mandatory target appropriate for a local/demo-first CS445 system while leaving production scaling as documented future posture.

## Inherited Decisions

- Workload criticality is Medium for catalog and streaming.
- Acceptance topology is one local/sandbox application instance and PostgreSQL.
- Project recovery objectives are RTO up to 4 hours and RPO up to 24 hours through backup and restore.
- Security Baseline and Resiliency Baseline are fully blocking where applicable.
- Partial PBT enforces PBT-02, PBT-03, PBT-07, PBT-08, and PBT-09 for Range logic.
- Vitest/Supertest are required; fake only external system boundaries.
- Public cloud, multi-zone, autoscaling, Kubernetes, and centralized observability are future scope.

## Applicability Review

| Category | Applicable | Decision focus |
|---|---|---|
| Scalability | Yes | explicit demo concurrency and future boundary |
| Performance | Yes | catalog latency, media first byte, Range efficiency |
| Availability | Yes | health/readiness, recovery objectives, degraded behavior |
| Security | Yes | validation, headers, path safety, secrets, signed redirects |
| Tech stack | Yes | NestJS persistence/config/contracts/test packages |
| Reliability | Yes | timeouts, stream cleanup, deterministic startup and seeds |
| Maintainability | Yes | module boundaries, migrations, generated contract, quality gates |
| Usability | Yes | loading/error/retry/accessibility without redesign |

## Clarification Questions

### Question 1 - Mandatory Load Profile

What load must the local/demo acceptance environment sustain without errors or unbounded resource growth?

A) At least 20 concurrent catalog/playlist requests and 5 concurrent local audio streams on one app instance; larger production capacity is future scope (recommended)

B) One interactive user only; no concurrency acceptance

C) Production target of at least 1,000 concurrent audio streams

D) Other - describe after `[Answer]:`

[Answer]: A

### Question 2 - Latency Targets

Which latency objectives should apply on the documented local acceptance machine with a seeded database?

A) Catalog/playlist API p95 <= 300 ms, local media response headers/first byte p95 <= 500 ms, and health p95 <= 200 ms under the approved load (recommended)

B) No measurable latency target; only functional correctness

C) All endpoints p95 <= 50 ms including provider redirects

D) Other - describe after `[Answer]:`

[Answer]: A

### Question 3 - Streaming Resource Efficiency

How should media memory/resource behavior be constrained?

A) Stream bounded byte ranges without buffering whole files; memory growth remains bounded per stream and every aborted/completed response closes its stream handle (recommended)

B) Buffer complete WAV files in NestJS memory before every response

C) Cache all audio files permanently in application memory

D) Other - describe after `[Answer]:`

[Answer]: A

### Question 4 - Availability and Recovery

Which availability posture should Unit 1 require?

A) No uptime SLA for the course demo; separate liveness/readiness, fail readiness when PostgreSQL or configured media dependency is unavailable, retain project RTO 4h/RPO 24h and document restore verification (recommended)

B) Require 99.99% uptime and multi-zone failover now

C) Expose liveness only and report ready even when persistence is unavailable

D) Other - describe after `[Answer]:`

[Answer]: A

### Question 5 - Security Baseline for Catalog and Media

Which security acceptance set should be mandatory?

A) Global bounded validation, safe errors/correlation IDs, secure headers, explicit CORS, body limits, server-derived media keys with path containment, environment-only secrets, signed Cloudinary URLs, dependency scan and SBOM instructions (recommended)

B) Validate only write endpoints because catalog/media are public reads

C) Rely entirely on Cloudinary and browser security controls

D) Other - describe after `[Answer]:`

[Answer]: A

### Question 6 - Unit 1 Technology Stack

Which stack should the NFR requirements lock for implementation?

A) NestJS 12/Express, TypeORM with PostgreSQL, migration-based schema, validated typed config, OpenAPI-derived frontend contracts, Cloudinary SDK adapter, Vitest/Supertest/fast-check, Docker Compose and GitHub Actions (recommended)

B) Replace NestJS with a separate Express application and use MongoDB

C) Keep data in JSON files and defer PostgreSQL/migrations

D) Other - describe after `[Answer]:`

[Answer]: A

### Question 7 - Testability and Quality Evidence

What evidence is required before Unit 1 can pass its quality gate?

A) Behavior-first unit/E2E tests, real HTTP partial-stream assertion, Range PBT with reproducible seed/shrinking, fresh migration/seed verification, lint/type/build, and no blocking Security/Resiliency/Standards/Spec review findings (recommended)

B) Manual browser demo only

C) Unit tests only with mocked controllers/repositories

D) Other - describe after `[Answer]:`

[Answer]: A

### Question 8 - Usability and Operability

Which UI/operations quality should be mandatory without redesign?

A) Existing responsive UI remains usable; added loading/error/retry controls are keyboard accessible with visible focus and safe Vietnamese text; structured logs contain timestamp/level/component/correlation ID and no sensitive paths/secrets (recommended)

B) Accessibility and structured logs are deferred entirely

C) Add a new administrative monitoring dashboard in Unit 1

D) Other - describe after `[Answer]:`

[Answer]: A

## Generation Checklist

- [x] Read approved Unit 1 Functional Design and inherited global NFR decisions.
- [x] Evaluate all eight mandatory NFR categories.
- [x] Separate local/demo acceptance from future production posture.
- [x] Collect and validate all eight answers.
- [x] Resolve ambiguous or conflicting targets through focused follow-up; answers are consistent, with implementation budgets deferred explicitly to NFR Design.
- [x] Generate `nfr-requirements.md`.
- [x] Generate `tech-stack-decisions.md`.
- [x] Validate measurable acceptance criteria and extension traceability.
- [x] Request explicit NFR Requirements approval before NFR Design.

## Status

Eight recommended answers A were authorized by the user response "A". Both artifacts are generated; explicit artifact approval is pending before NFR Design.
