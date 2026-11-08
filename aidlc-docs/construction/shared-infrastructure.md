# Shared Infrastructure Ownership

## Ownership

Unit 1 creates the minimum shared foundation inside the existing monolith. Subsequent units extend these contracts through their own reviewed slice; they do not introduce a separate foundation unit or rewrite prior migrations.

| Shared resource | Unit 1 owns | Later extension |
|---|---|---|
| Application factory/config/errors/logging | Runtime and production-equivalent E2E setup | Provider/auth/payment fields and policies |
| PostgreSQL and TypeORM | Compose, isolated roles/databases, migration baseline | Unit 3 User/AuthSession; Unit 4 payment/outbox; Unit 5 delivery |
| Contract/client pipeline | OpenAPI generation and browser-safe client | AI/auth/payment methods |
| Media adapter | Local delivery and optional Cloudinary | No implicit ownership transfer |
| Health/readiness | Common probe contract and safe response | Required dependency checks per unit |
| CI/test foundation | Root/server gates, migration/seed/PBT reports | Slice-specific behavior and full journey |
| Recovery/runbook | Daily backup policy, restore instructions and evidence format | Expanded schema and failure scenarios |

## Isolation and Coordination

- Development, test and recovery databases use explicit distinct identities and permissions.
- One implementation owner edits shared bootstrap/config/contracts/migration registration at a time.
- Review/analysis work is read-only unless explicitly assigned disjoint files.
- Provider secrets stay local/CI-secret storage; fake/demo mode is explicit.
- Packages, images and CI actions are pinned and reviewed; exact values are validated at implementation.
- No GitHub issue, PR, cloud resource or scheduler is created merely by this document.

## Future Units

Unit 2 consumes catalog/config/client foundations. Unit 3 adds identity/session schema and guards. Unit 4 atomically writes payment/VIP/outbox state in PostgreSQL. Unit 5 processes that outbox in-process and adds delivery state. No broker or distributed cache is required by the approved five-slice design.
