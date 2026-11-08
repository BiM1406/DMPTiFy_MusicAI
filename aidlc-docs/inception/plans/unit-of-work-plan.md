# Unit of Work Generation Plan

## Objective

Generate exactly five logical units of work inside the single NestJS service, each corresponding one-to-one with an approved vertical slice. Units must group stories, dependencies, frontend seams, tests, and documentation into independently reviewable Construction increments.

## Fixed Constraints

- Unit count is exactly five.
- Units are logical modules/increments, not independently deployable microservices.
- Execution order approved in Workflow Planning is Slice 1 through Slice 5.
- Shared platform work must be owned explicitly; no hidden horizontal foundation unit is allowed.
- Every user story must map to exactly one owning unit, though personas may span units.

## Applicability Review

- **Story grouping**: applicable; stories already group by five slices.
- **Dependencies**: applicable; Catalog precedes AI, Auth precedes Payment, Payment precedes Invoice.
- **Team alignment**: applicable; Superpowers/subagent responsibilities must avoid shared-file collisions.
- **Technical considerations**: applicable; database, contracts, config, provider adapters, frontend seams, and tests cross package boundaries.
- **Business domain**: applicable; units align to catalog/media, recommendation, identity, payment, and notification capabilities.
- **Greenfield code organization**: not applicable; this is a brownfield modular monolith and Application Design already defines organization.

## Questions

### Question 1 - Unit Boundary

How should the approved five slices be represented as units?

A) Exactly five logical units inside one deployable NestJS service, one unit per approved slice (recommended)

B) One large unit containing all five slices

C) Five independently deployable microservices

D) Other - describe after `[Answer]:`

[Answer]: A

### Question 2 - Shared Foundation Ownership

Where should cross-cutting bootstrap, database, config, logging, errors, health, OpenAPI, Docker Compose, and initial CI work live?

A) Unit 1 owns the minimum shared foundation; later units extend it only for their approved behavior (recommended)

B) Create an additional Unit 0 before the five slices

C) Delay all shared foundation until the final Build and Test phase

D) Other - describe after `[Answer]:`

[Answer]: A

### Question 3 - Dependency and Delivery Order

How should units be implemented and approved?

A) Strict sequence 1 through 5; each unit reaches design, TDD, review, and approval before the next begins (recommended)

B) Implement Units 2 and 3 in parallel after Unit 1, then continue 4 and 5

C) Implement all backend units first, then all frontend wiring and tests

D) Other - describe after `[Answer]:`

[Answer]: A

### Question 4 - Team/Subagent Ownership

How should Superpowers coordination work inside a unit?

A) One implementation owner edits shared runtime files; parallel subagents handle test/spec/security analysis and Standards/Spec review (recommended)

B) Multiple subagents edit the same server modules concurrently

C) Do not use subagents anywhere in Construction

D) Other - describe after `[Answer]:`

[Answer]: A

### Question 5 - Unit Definition of Done

When is a unit complete?

A) Backend behavior, required minimal frontend seam, migrations/config, TDD tests, docs, extension compliance, and `/review` findings all complete (recommended)

B) Backend endpoints compile; frontend/tests/docs may be deferred

C) Unit tests pass; E2E/integration are deferred to final Build and Test

D) Other - describe after `[Answer]:`

[Answer]: A

## Generation Checklist

- [x] Validate all answers and resolve contradictions.
- [x] Confirm exactly five logical units and their ownership boundaries.
- [x] Generate `aidlc-docs/inception/application-design/unit-of-work.md`.
- [x] Generate `aidlc-docs/inception/application-design/unit-of-work-dependency.md`.
- [x] Generate `aidlc-docs/inception/application-design/unit-of-work-story-map.md`.
- [x] Assign every one of the 15 stories to exactly one owning unit.
- [x] Define inputs, outputs, frontend seam, tests, and Definition of Done for each unit.
- [x] Validate dependency direction and execution order.
- [x] Validate Security, Resiliency, and partial PBT ownership by unit.
- [x] Validate Markdown/Mermaid and update every checkbox immediately.

## Mandatory Outputs

- `unit-of-work.md`
- `unit-of-work-dependency.md`
- `unit-of-work-story-map.md`

## Status

Plan approved by Nguyễn Tuấn Đạt with choice A. All three mandatory artifacts were generated and validated; Units Generation now awaits explicit artifact approval before Construction.
