# Unit 1 Code Generation Plan

## Authority and Scope

This is the single source of truth for Unit 1 implementation in C:/DMPTiFy_MusicAI, a brownfield repository. Infrastructure Design is approved by user response "làm đi". This concrete code plan awaits approval before execution under the selected sequential AI-DLC workflow.

Implement US1.1-US1.4 only. Preserve existing UI and unrelated working changes. No commit, stash, reset, remote publication, scheduler installation, cloud provisioning or later-slice implementation is included.

## Inputs and Interfaces

Use approved Unit 1 functional, NFR and infrastructure artifacts under aidlc-docs/construction/unit-1-catalog-media/ plus construction/shared-infrastructure.md and the Inception unit/story map.

Public HTTP: GET /api/songs, GET /api/playlists, GET /api/playlists/:playlistId, GET /api/audio/:songId, GET /api/health and GET /api/health/ready. Catalog payloads are validated Song/Playlist projections, counts derive from membership, and playlist detail preserves membership order. Local audio returns 200/206/416; missing songs 404; unavailable media safe 503. Cloudinary uses explicit configured signed delivery without local fallback.

Owned persistent entities: Song, Playlist, PlaylistSong. Pure RangeParser and a narrow MediaStoragePort hide protocol/storage complexity. The typed browser client owns URL/error mapping. Likes remain client session state.

## Roles and Skills

Primary implementation owner: this agent, following /tdd and approved specifications. Activate /diagnose only for reproduced failures. At the review gate, /review performs Standards and Spec reviews through its prescribed parallel reviewers against the recorded baseline. Reviewers do not edit shared files. Repository skill configuration is already complete.

## Execution Steps

Every numbered implementation step is decomposed into focused behavior checks, normally one short RED-GREEN-REFACTOR cycle at a time. Step sizes below describe deliverables, not calendar promises. Do not write all tests in bulk before implementation.

### Step 1 - Record Baseline and Verify Compatibility (US1.4)

- [ ] Record HEAD f9f76a9a4bb546cf06aa30c3fa3185877dfa2e76 (recheck for concurrent changes), status and content hashes of affected files; save non-secret copies/diffs of scoped source/config files in a local ignored .scratch/unit-1-baseline/ snapshot. Never snapshot .env or credentials. Use this pre-change working-tree baseline for review; HEAD comparison alone includes prior user edits.
- [ ] Read relevant installed Next.js guides before frontend changes. Verify Node, NestJS/TypeORM/Vitest ESM/decorator compatibility and Cloudinary enforceable expiry against primary docs. Unsupported expiry blocks provider acceptance and requires a concrete resolution; do not substitute ordinary signature for expiry.
- [ ] Run existing root/server lint/build/tests once and record pre-existing failures separately in aidlc-docs/construction/unit-1-catalog-media/code/verification.md.

### Step 2 - Shared Bootstrap and Config Tracer (US1.4)

- [ ] Write one failing bootstrap/config behavior, then minimal implementation in server/src/platform/config.ts and server/src/platform/create-application.ts; modify server/src/main.ts and server/src/app.module.ts in place.
- [ ] Extend server/package.json and lockfile with compatible validated-config/validation, database, security, OpenAPI and media dependencies only as needed. Add bootstrap/config tests in server/test/platform.e2e-spec.ts and server/src/platform/config.spec.ts. Missing required selected-provider config fails safely.

### Step 3 - PostgreSQL and First Persisted Song (US1.1, US1.4)

- [ ] Add compose.yaml, server/.env.example, root .env.example and server/scripts/init-databases.sql for project PostgreSQL and isolated roles/databases. Pin verified compatible image/runtime values. Check tools/ports before starting only the project service.
- [ ] Through one failing catalog HTTP behavior, add server/src/database/data-source.ts, migrations/initial-catalog.ts and seed.ts, plus catalog/song.entity.ts, playlist.entity.ts and playlist-song.entity.ts. Schema synchronization stays disabled. Test fresh migration and repeat seed only against the verified test database.
- [ ] Add server/src/catalog/catalog.module.ts, catalog.service.ts, catalog.controller.ts and catalog.dto.ts; complete GET /api/songs with real persistence and contract-safe fields. Test in server/test/catalog.e2e-spec.ts.

### Step 4 - Persisted Playlists (US1.2)

- [ ] Extend the catalog boundary behavior by behavior: summaries/counts, exact ordered detail, unknown playlist and empty playlist. Seed stable IDs/current presentation and explicit memberships: pl-1=[song-2], pl-2=[song-1,song-3], pl-3=[song-5], pl-4=[song-4]. Update existing migration/seed only before its first delivery; later changes use new migrations.

### Step 5 - Range Deep Module (US1.3)

- [ ] Add server/src/media/range-parser.ts and range-parser.spec.ts one example at a time: full, closed, open, suffix, invalid, multiple and unsatisfiable. Add fast-check invariants only after public parser behavior exists; retain replay seed/path and shrinking evidence.

### Step 6 - Real Local HTTP Streaming (US1.3)

- [ ] Add server/src/media/media.module.ts, media.service.ts, media.controller.ts, media-storage.port.ts and local-media.adapter.ts. Test server/test/media.e2e-spec.ts with real temporary fixture files and requests.
- [ ] Verify 200/206/416 bytes and headers, safe 404/503, path containment/symlink escape, backpressure and abort cleanup. No whole-file buffering or retry after headers. Stream current public/audio fixtures via configured root.

### Step 7 - Explicit Cloudinary Adapter (US1.3, US1.4)

- [ ] Add server/src/media/cloudinary-media.adapter.ts and cloudinary-media.adapter.spec.ts. Test configured delivery/access policy at provider boundary, bounded timeout/retry and absence of fallback. Verify actual account capability through opt-in provider smoke only when credentials/access are available; report blocked provider evidence honestly.

### Step 8 - Security, Health and Failure Paths (US1.1-US1.4)

- [ ] Add platform/api-error.filter.ts, request-context.ts, request-policy.ts and health.controller.ts with focused public HTTP regressions. Enforce approved bounds/CORS/headers/throttles, safe correlation logs, pool/dependency budgets and 5s readiness cache.
- [ ] Exercise unavailable/recovered database, provider timeout, missing file and shutdown resource cleanup. Keep liveness shallow. Diagnose deterministic failures before changing assumptions.

### Step 9 - Contract Generation and Browser Client (US1.1, US1.2)

- [ ] Add server/scripts/export-openapi.ts, generated contracts/openapi.json and src/lib/api/generated.ts via scripts; add src/lib/api/client.ts for base URL, credentials, bounded requests and safe errors. Add catalog detail to the client contract. Modify package scripts/lockfiles for deterministic generation/drift checking.
- [ ] Add vitest.config.ts and meaningful client/store tests as needed; use HTTP fakes only at the network boundary.

### Step 10 - Existing Frontend Wiring (US1.1-US1.3)

- [ ] Modify src/store/useAudioStore.ts, src/types/music.ts and src/app/page.tsx for catalog hydration, exact playlist selection, session likes and backend audio resolution. Add src/store/useAudioStore.spec.ts and src/lib/api/client.spec.ts.
- [ ] Modify MainContent.tsx and Sidebar.tsx in src/components/layout/ to use hydrated playlists/counts, loading/error/retry and stable data-testid attributes. Preserve styles and current responsive UI. Touch BottomPlayer.tsx only where empty/loading playback or backend media integration requires it.
- [ ] Verify no autoplay during initial hydration, like consistency across catalog/playlist/currentSong, stale playlist-response suppression, Discover/reset behavior, empty playlist and safe retry. Retain karaoke/LRC seeking and current repeat/shuffle behavior; add regression coverage for any necessary store refinement.

### Step 11 - Runbook, Recovery and CI (US1.4)

- [ ] Add server/scripts/backup.ps1 and restore.ps1 with explicit validated targets and retention limited to project backup files; document encrypted destination/scheduler setup without installing system tasks. Verify restore into an isolated database when environment permits.
- [ ] Add .github/workflows/ci.yml with isolated PostgreSQL, locks, quality/migration/PBT/contract checks, dependency scanning and SBOM/report artifacts. Update README.md and server/README.md to distinguish implemented/local/provider/future behavior. Add scripts/check-unit1-load.mjs for repeatable load/resource evidence and record overrides.

### Step 12 - Verify and Review (US1.1-US1.4)

- [ ] Run relevant unit/E2E/PBT, fresh migration/repeated seed, root/server lint/type/build and contract drift gates. Run mixed-load and aborted-stream resource batches; retain actual outcomes and limitations.
- [ ] Start local services as required and open one tab in the existing browser; verify catalog/playlists/playback/seek/lyrics and keyboard/error/retry seams.
- [ ] Run Standards and Spec review against the recorded working-tree snapshot and approved artifacts. Resolve blockers, rerun affected tests, and write business/API/repository/frontend implementation summary in aidlc-docs/construction/unit-1-catalog-media/code/implementation-summary.md.
- [ ] Present implementation and evidence for approval before advancing to Unit 2. Do not mark unavailable provider/backup/CI evidence as passed.

## Story Completion

- [ ] US1.1 - persisted catalog and recoverable existing UI.
- [ ] US1.2 - membership-derived playlists and exact selection.
- [ ] US1.3 - real bounded streaming and seeking, explicit provider behavior.
- [ ] US1.4 - repeatable setup, provider/config failures and reproducible tests.

## Approval

A) Approve this complete implementation sequence and scoped working-tree snapshot baseline; begin TDD implementation (recommended)

B) Request changes to the plan

C) Pause

D) Custom direction

[Answer]:
