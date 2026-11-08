# Unit 1 Infrastructure Design

## Approved Topology

All five infrastructure answers are A. One Windows workstation runs Next.js and NestJS as host Node processes. Docker Compose runs PostgreSQL only. This is the mandatory local/demo topology; no cloud resources are provisioned at this stage.

| Logical component | Physical mapping | Responsibility |
|---|---|---|
| Next.js frontend | Root host process, loopback port 3000 | Existing interface, typed API client and static covers/lyrics |
| NestJS API | server/ host process, loopback port 3001 | /api catalog/media, config, safe errors and health |
| PostgreSQL | Project-scoped Compose service, host binding 127.0.0.1:5432 | Persistent application data and isolated test database |
| Local media adapter | Configured absolute root C:/DMPTiFy_MusicAI/public/audio | Read-only runtime access to existing WAV fixtures |
| Cloudinary adapter | Explicit remote provider mode | Signed delivery and bounded readiness probe |
| Logs/readiness | Console JSON plus /api/health and /api/health/ready | Local diagnosis and deployment checks |
| CI | GitHub Actions with ephemeral PostgreSQL | Reproducible quality evidence |

## Runtime and Configuration

Implementation must inspect package engines, installed runtimes and primary compatibility documentation before pinning Node/PostgreSQL versions and image digests. No unverified version or floating image tag is an accepted reproducibility pin.

Planned configuration includes backend host/port, frontend API base URL, explicit CORS origins, application/test database credentials, MEDIA_PROVIDER, MEDIA_ROOT and selected Cloudinary credentials. Names are finalized in the typed config schema and .env.example during code planning. Only browser-safe base URLs may enter NEXT_PUBLIC variables. Credentials and signed delivery URLs must never enter generated public contracts or logs.

Both localhost and 127.0.0.1 represent distinct browser origins; configure the exact frontend origin used. Ports are configurable and checked before startup. Browser audio URLs must resolve /api/audio/:songId against the backend origin, rather than mistakenly against Next.js. Restrict local API/database bindings to loopback; future remote deployment requires explicit HTTPS, trusted proxy and encrypted persistence/transport configuration.

## Database and Migration Isolation

- Use a project-scoped named volume for PostgreSQL data; unrelated projects/volumes are not touched.
- Provision dmptify for application use and dmptify_test with a distinct test role. Runtime roles have access only to their own database/schema. Disable default cross-database connection access as needed; separate database names alone do not prove isolation.
- Separate provisioning/migration privileges from runtime privileges. No normal application connection uses the PostgreSQL superuser.
- TypeORM synchronization remains disabled. Explicit commands apply migrations and idempotent seeds after database readiness and before application acceptance.
- Test setup validates the test database identity before any reset/cleanup. CI databases are disposable; local application data is not.
- A failed migration blocks release/startup acceptance and triggers inspection or forward-fix, not an automatic destructive rollback.

## Media and Provider Boundary

Local fixtures remain at public/audio and are read through a canonical absolute MEDIA_ROOT. Enforce realpath containment and symlink escape rejection. This is application-level read-only behavior for a host process; do not claim Docker mount enforcement for a directory read by the host.

The existing Next.js public/audio path may still serve fixture bytes directly. Unit 1 requires the integrated player to use the backend route; the demo does not claim exclusive/protected media access. Deployment packaging must exclude public audio if protected delivery later becomes a requirement.

Cloudinary mode requires validated configuration and enforceable expiry/access controls for the proposed five-minute signed delivery contract. Verify SDK/account capability before implementation acceptance; signing alone is not proof of expiry. Do not silently replace unsupported provider behavior with local bytes.

## Backup and Recovery

- Create daily PostgreSQL logical backups and keep seven daily copies, plus a separate pre-migration backup. Back up earlier than the 24h RPO boundary to leave margin for execution delays.
- Store backups outside the live database volume in an operator-configured encrypted-at-rest destination; verify encryption before recording compliance. Keep keys/credentials separate and out of the repo.
- Provide repeatable backup/restore scripts and scheduler setup instructions. Installing a Windows scheduled task is an explicit system change requiring authorization; documentation alone is not a working schedule.
- Retention cleanup is limited to validated project backup files in the explicit backup destination. No broad directory cleanup is permitted.
- Restore into an isolated recovery database and verify catalog/membership through API queries. Record backup timestamp, elapsed recovery time, counts, failure/recovery observations and safe evidence.
- RTO <=4h and RPO <=24h are targets to demonstrate. Backups on the same workstation do not protect against workstation loss; external recoverable storage is required for that failure scenario.
- Retain original media source fixtures independently of database backups.

## CI and Monitoring

PR/push workflows install from lockfiles, run root/server lint/type/build, migrations/repeated seeds against isolated PostgreSQL, unit/E2E/Range PBT, contract drift checks and dependency scans. Generate SBOM and sanitized test reports as CI artifacts. Fork PRs use deterministic local/fake boundaries and receive no provider secrets. Prefer read-only workflow permissions and pin actions to reviewed immutable revisions.

Application checks expose shallow liveness and dependency readiness with the approved five-second readiness cache. Logs contain safe structured context. CI must actually execute before its success is claimed; this stage defines the workflow only.

## NFR and Extension Mapping

| Requirement group | Infrastructure evidence to produce |
|---|---|
| U1-NFR-01/02/03 | Documented local host facts, mixed load configuration, latency/resource report |
| U1-NFR-04/08/09 | Health/readiness, bounded operations, explicit adapter config and fault evidence |
| U1-NFR-05 | Encrypted backup destination, scheduler evidence and isolated restore report |
| U1-NFR-06/07/13 | Loopback network, CORS/config, secret exclusion and safe logs |
| U1-NFR-10/11/14 | Fresh database setup, migration/seed, contract drift and full CI evidence |
| U1-NFR-12 | Existing frontend plus keyboard/error/retry verification |

Security and Resiliency controls remain applicable as defined in the approved baselines; local HTTP is an explicit development exception. PBT seed/path replay artifacts are retained without sensitive data. Public-cloud IAM/multi-zone controls remain future scope, not implemented guarantees.
