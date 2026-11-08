# Unit 1 Infrastructure Design Plan

## Objective

Map the approved catalog/media functional and NFR components onto a repeatable local CS445 environment and document the shared foundation for Units 2-5. Preserve the existing frontend and single NestJS service. No infrastructure is provisioned by this plan.

## Inherited Decisions

- PostgreSQL/TypeORM, migrations and idempotent seeds; no automatic runtime schema synchronization.
- One acceptance instance; local media default, explicit Cloudinary mode.
- Root Next.js frontend, NestJS backend in server/, Docker Compose PostgreSQL, GitHub Actions.
- RTO <=4h, RPO <=24h, backup/restore; future public cloud is optional.
- Shared foundation belongs to Unit 1. No broker or Redis for this unit.
- Cloudinary enforceable signed URL expiry remains an implementation capability check, not an assumed feature.

## Category Assessment

| Required category | Mapping / decision |
|---|---|
| Deployment environment | Local Windows host plus Docker Desktop; Q1 |
| Compute infrastructure | Host Node processes or containerized apps; Q1 |
| Storage infrastructure | Compose PostgreSQL, isolated tests, media root and backup; Q2-Q3 |
| Messaging infrastructure | Not applicable to Unit 1; approved design has no messaging workload. Later outbox remains PostgreSQL-backed |
| Networking infrastructure | Loopback ports, origin allowlist and explicit environment URLs; Q4 |
| Monitoring infrastructure | Health/readiness, structured console logs and GitHub evidence; Q5 |
| Shared infrastructure | One project-scoped database service; separate test database, shared config/CI ownership; Q2/Q5 |

## Questions

### Question 1 - Local Compute Layout

A) Run Next.js and NestJS as host Node processes; Docker Compose runs PostgreSQL only; document startup order and compatible pinned runtime versions (recommended)

B) Containerize frontend, backend and PostgreSQL in Compose now

C) Use an already-installed host PostgreSQL instead of Docker; provide connection details without secrets

D) Custom direction

[Answer]: A

### Question 2 - Database and Test Isolation

A) One project-scoped Compose PostgreSQL service with named volume; application database dmptify and explicitly isolated dmptify_test database/user; CI uses an ephemeral PostgreSQL service. Pin compatible image version/digest during implementation (recommended)

B) Separate PostgreSQL containers for development and tests, with dedicated ports/volumes

C) Use an existing remote PostgreSQL service; supply non-secret provisioning constraints

D) Custom direction

[Answer]: A

### Question 3 - Local Media and Recovery Storage

A) Resolve a configured absolute media root to existing public/audio fixtures for local demo; app reads it without runtime writes. Daily PostgreSQL logical backups, 7 daily copies, backup before migrations, encrypted-at-rest external backup destination and isolated restore verification; never commit dumps/secrets (recommended)

B) Copy audio fixtures to a dedicated server media directory and use the same backup/recovery policy

C) Supply an existing media/backup policy, including retention and encryption, for reuse

D) Custom direction

[Answer]: A

The selected backup destination must be separate from the database volume and have verified encryption. Local fixtures remain source assets; database backup is not a substitute for media retention. Infrastructure artifacts must distinguish a documented schedule from a successfully installed scheduler.

### Question 4 - Local Network Defaults

A) Frontend localhost:3000, backend localhost:3001 with /api prefix, PostgreSQL published only on 127.0.0.1:5432; all ports configurable and checked for conflicts before startup. CORS permits only configured frontend origins; no public gateway/TLS termination in local acceptance (recommended)

B) Same ports but Next.js proxies browser API requests through a same-origin route, adding proxy configuration

C) Use custom existing ports/origins; specify them

D) Custom direction

[Answer]: A

Local HTTP is a development exception only; a future deployed/provider environment must configure HTTPS and encrypted persistence/backup transport appropriately. Browser-facing audio URLs must resolve against the backend base URL when using separate origins.

### Question 5 - CI, Monitoring and Shared Ownership

A) GitHub Actions on PR/push runs root/server lint/build/tests, isolated PostgreSQL migration/seed and Range PBT, dependency scan and contract drift check; publish sanitized reports/SBOM artifacts. Use console JSON logs and health/readiness for local operations; no new dashboard. Unit 1 owns shared workflow/config; later units extend through their own slice (recommended)

B) Same quality gates run locally only; revise the approved GitHub Actions requirement explicitly

C) Integrate with an existing CI/monitoring service; provide the reference

D) Custom direction

[Answer]: A

## Checklist

- [x] Review inherited functional/NFR constraints and current repository infrastructure inventory.
- [x] Assess all seven infrastructure categories and justify inapplicable messaging.
- [x] Collect and validate five answers; all recommended choices A are consistent with prior design.
- [x] Generate unit infrastructure-design.md with component mapping, environment/config, storage and recovery policies.
- [x] Generate deployment-architecture.md with local/CI topology, startup order and failure/rollback behavior.
- [x] Generate construction/shared-infrastructure.md with cross-unit ownership and isolation.
- [x] Verify NFR/extension traceability and distinguish planned provisioning from verified runtime evidence.
- [x] Request artifact approval before Code Generation planning.

## Status

User response "1" authorized A,A,A,A,A. Three artifacts generated and validated; awaiting Infrastructure Design artifact approval before Code Generation planning. No infrastructure provisioning or application changes executed at this stage.
