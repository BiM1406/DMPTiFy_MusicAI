# Unit 1 Technology Stack Decisions

## Selected Stack

These decisions preserve the approved architecture. Package compatibility and exact versions must be verified against the existing lockfiles and primary documentation during implementation.

| Area | Decision | Rationale / constraint |
|---|---|---|
| Backend | Existing NestJS 12 with Express | Extend server/ modular monolith and shared application factory |
| Persistence | PostgreSQL with TypeORM | Relational membership integrity and later transactional payment state |
| Schema | Explicit migrations and idempotent seeds | No runtime synchronize dependency; fresh database verification |
| Configuration | Validated typed environment configuration | Fail fast; safe placeholders only in .env.example |
| API contracts | OpenAPI-derived frontend types/client boundary | Keep browser contracts aligned without importing server internals |
| Local media | Bounded Node streams behind MediaStoragePort | Single-range delivery, backpressure and cancellation cleanup |
| Cloudinary | SDK adapter behind MediaStoragePort | Signed redirects, explicit selection, no silent fallback |
| Unit/E2E | Existing Vitest and Supertest | Production-equivalent bootstrap and observable HTTP behavior |
| Properties | fast-check with Vitest | Range invariants, shrinking, reproducible failure replay |
| Local infrastructure | Docker Compose PostgreSQL | Repeatable local/demo setup |
| CI | GitHub Actions | Lint/build/test/PBT, dependency scan and artifact evidence |
| Frontend | Existing Next.js/React/Zustand | Hydrate current UI, preserve presentation and playback interactions |

## Operational Constraints

- Document compatible Node/PostgreSQL versions and pin reproducible dependencies/images during Infrastructure Design and implementation.
- Preserve current ESM/TypeScript setup; verify NestJS, decorators, TypeORM, and Vitest compatibility before adding dependencies.
- Generate contracts deterministically and check drift before frontend wiring.
- Use separate test database configuration; migration/seed commands must identify their target explicitly.
- Keep cloud credentials and storage keys out of browser bundles, generated contracts, and logs.

## Deferred Decisions

NFR Design owns precise timeout/retry/rate-limit/cache/redirect-expiry policies and resilience test approach. Infrastructure Design owns image versions, ports/volumes, backup retention and local deployment details. These are pending design tasks, not implied approvals of new infrastructure.
