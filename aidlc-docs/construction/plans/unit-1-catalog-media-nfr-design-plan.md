# Unit 1 NFR Design Plan

## Objective and Inputs

Translate approved U1-NFR-01 through U1-NFR-14 into concrete patterns and logical components for catalog and media. Inputs: approved Functional Design, NFR Requirements, technology decisions, and enabled Security/Resiliency/partial-PBT baselines. No new infrastructure or frontend redesign is implied.

## Category Assessment

| Required category | Evidence and question |
|---|---|
| Resilience | Database/provider failure and streaming cancellation; Q1 |
| Scalability | One instance, 20 catalog requests and 5 streams; Q2 |
| Performance | p95 targets, bounded streaming and reproducible measurement; Q3 |
| Security | Public endpoints, media containment, configuration and safe errors; Q4 |
| Logical components | Shared pipeline, readiness, media adapter and catalog query; Q5 |
| Resilience testing | Mandatory user-owned RESILIENCY-14 decision; Q6 |

## Questions

### Question 1 - Timeouts and Retry

A) Database connection 5s/query 2s; local metadata operation 2s; Cloudinary network operation 5s; at most one retry with 100-300ms jitter for classified transient read-only metadata failures within an overall 10s request budget; never retry an already-started stream (recommended)

B) Same timeout budgets but disable all automatic retries

C) Custom per-operation budgets required before design generation

D) Custom direction

[Answer]: A

### Question 2 - Scaling and Admission

A) Single instance, bounded DB pool of 10; preserve 5 concurrent stream acceptance; configurable per-IP catalog throttle 120/min and media-request throttle 600/min, verified not to break normal seeking; return safe 429 with retry guidance when exceeded (recommended)

B) Single instance with pool of 5 and no application throttling beyond body/header bounds

C) Add distributed admission control and horizontal scaling now, requiring scope revision

D) Custom direction

[Answer]: A

### Question 3 - Performance and Resource Evidence

A) Avoid whole-file buffering and global audio cache; use indexed IDs/membership queries and bounded stream buffers. Warm up 10s, measure 60s with 20 catalog workers and 5 stream workers; report at least 100 samples per measured route. Record RSS/handles over repeated completed/aborted batches; acceptance requires no accumulating open handles and post-warm-up RSS growth <= 64 MiB across 10 identical batches (recommended)

B) Same resource model but manual latency measurements only, requiring revision of repeatable acceptance evidence

C) Add an in-memory catalog cache with invalidation before measuring the database path

D) Custom direction

[Answer]: A

### Question 4 - Concrete Security Policy

A) Explicit frontend CORS allowlist, 16KiB JSON limit, bounded IDs/Range headers, safe correlation IDs, secure headers, realpath containment including symlink escape rejection, environment-only secrets, and private/no-store signed redirects with configurable 5-minute TTL (recommended)

B) Same application policy but require reverse-proxy enforcement for body/header limits and throttling; deployment dependency must be designed

C) Custom security policy required before artifact generation

D) Custom direction

[Answer]: A

### Question 5 - Logical Components and Readiness

A) Shared config/request/error pipeline plus CatalogQuery, RangeParser, MediaStoragePort, local/Cloudinary adapters, readiness and structured logging. Cache readiness checks briefly (5s), bound each dependency probe, use a lightweight configured media probe without downloading audio. No broker/Redis needed for Unit 1 (recommended)

B) Same components plus Redis for shared readiness/cache state, requiring scope and infrastructure revision

C) Keep probes uncached but still bounded; accept the extra probe load

D) Custom direction

[Answer]: A

### Question 6 - Resiliency Testing Approach (RESILIENCY-14)

How will recovery and failure-handling mechanisms be validated?

A) Use an existing DR/game-day/chaos practice; provide the reference

B) No practice exists: propose a lightweight DR schedule and fault experiment plan for adoption, track evidence in GitHub Issues; include DB unavailable/recovered, missing local file, provider timeout, aborted stream, and backup restore scenarios (recommended)

C) Capture scenarios now and defer operational drills to Operations; retain mandatory implementation fault tests and restore-verification evidence for Unit 1

D) Custom direction

[Answer]: B

Recommended answer vector: A, A, A, A, A, B. Timing and resource limits are proposed acceptance policies, not measured capabilities. Dependency timeout enforcement must cancel underlying work where supported; a Promise timeout alone does not release resources. A total stream lifetime must not be confused with the pre-stream request budget.

## Checklist

- [x] Read approved NFR Requirements and assess all required design categories.
- [x] Identify remaining pattern decisions and mandatory resilience-testing question.
- [x] Collect and validate answers; Q6 B adopts the proposed lightweight testing schedule.
- [x] Generate `nfr-design-patterns.md` with timeout, retry, admission, security and measurement policies.
- [x] Generate `logical-components.md` with responsibilities, dependency direction and failure boundaries.
- [x] Map all U1 NFRs and applicable extension constraints to patterns and verification evidence.
- [x] Validate documentation and request explicit artifact approval before Infrastructure Design.

## Status

Answers A,A,A,A,A,B authorized by user response "1". Artifacts generated; awaiting artifact approval before Infrastructure Design. Provider expiry capabilities and benchmark throttle configuration are explicitly tracked implementation verification items.
