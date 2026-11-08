# DMPTiFy User Stories

## Story Conventions

- Stories are grouped under exactly five approved vertical slices.
- Each story represents one observable behavior suitable for a focused TDD tracer bullet.
- Acceptance criteria use Given/When/Then and include API/UI evidence plus relevant failure behavior.
- Provider names describe system boundaries; external services are not treated as user personas.

## Slice 1 - Core Songs, Playlists, and Audio Streaming

### US1.1 - Browse the Persisted Song Catalog

**Persona**: P1 Listener  
**Requirements**: FR-G01, FR-G02, FR-G04; Slice 1 catalog requirements

**As a** listener, **I want** the existing song cards to load from the backend catalog **so that** I can discover playable music backed by real persisted data.

#### Acceptance Criteria

- **Given** the database has been migrated and seeded, **when** the listener opens DMPTiFy, **then** the existing catalog UI displays the persisted songs with title, artist, cover, mood, BPM, and playable media URL.
- **Given** the API is unavailable, **when** catalog loading fails, **then** the UI shows a recoverable state without replacing the existing visual design or exposing technical details.
- **Given** an invalid catalog record is encountered, **when** the API serializes the response, **then** it rejects or omits unsafe invalid data according to the contract rather than sending an unvalidated shape.

### US1.2 - Browse Persisted Playlists

**Persona**: P1 Listener  
**Requirements**: FR-G02, FR-G04; Slice 1 playlist requirements

**As a** listener, **I want** playlist cards to represent persisted membership **so that** playlist counts and mood filtering correspond to actual songs.

#### Acceptance Criteria

- **Given** seeded playlist membership, **when** the listener loads playlists, **then** each existing playlist card shows a count derived from membership rather than a hard-coded number.
- **Given** the listener selects a playlist, **when** its songs are requested, **then** the existing catalog area presents only that playlist membership using the existing interaction style.
- **Given** a playlist is empty, **when** it is selected, **then** the existing empty-state pattern is shown.

### US1.3 - Stream and Seek Audio Reliably

**Persona**: P1 Listener  
**Requirements**: Slice 1 audio requirements and acceptance criteria; NFR-01, NFR-04

**As a** listener, **I want** audio playback to support byte-range seeking **so that** I can start and seek a song without downloading the whole media file again.

#### Acceptance Criteria

- **Given** a valid byte range, **when** the browser requests a song, **then** the API responds `206` with correct range, length, type, and `Accept-Ranges` headers and returns exactly the requested bytes.
- **Given** no range header, **when** the browser requests local media, **then** the approved full-response behavior is returned with a correct content length.
- **Given** malformed or unsatisfiable range input, **when** the request is processed, **then** the API returns `416` safely without reading outside the media boundary.
- **Given** the listener seeks from the existing player or karaoke view, **when** the browser makes a new range request, **then** playback resumes from the selected position.

### US1.4 - Run a Deterministic Catalog and Media Demo

**Persona**: P3 Project Operator/Tester  
**Requirements**: FR-G02, FR-G03; NFR-04, NFR-06

**As a** project operator, **I want** migrations, seed data, and explicit local/Cloudinary media modes **so that** I can demonstrate Slice 1 repeatedly without hidden environment assumptions.

#### Acceptance Criteria

- **Given** the documented local environment, **when** migrations and seed commands run, **then** the five approved songs and four playlists are available deterministically.
- **Given** local mode, **when** the server starts without Cloudinary secrets, **then** local media is selected explicitly and Range E2E tests pass.
- **Given** provider mode, **when** required Cloudinary configuration is missing, **then** startup fails fast with a safe configuration error instead of silently using local mode.
- **Given** Range PBT runs in CI, **when** a property fails, **then** the seed and shrunk counterexample are reported for replay.

## Slice 2 - Gemini Mood Analysis and Recommendations

### US2.1 - Describe a Mood and Receive a Valid Analysis

**Persona**: P1 Listener  
**Requirements**: Slice 2 analysis requirements; FR-G01, FR-G03

**As a** listener, **I want** to describe how I feel in the existing AI drawer **so that** Gemini can return a supported mood, target BPM, and empathetic response.

#### Acceptance Criteria

- **Given** a bounded non-empty message, **when** the listener submits it, **then** the backend returns a validated supported mood, in-range target BPM, and display-safe reply text.
- **Given** Gemini returns invalid or incomplete function output, **when** the backend validates it, **then** the request fails safely rather than forwarding an invalid structure.
- **Given** an oversized or invalid message, **when** it reaches DTO validation, **then** the API rejects it before calling Gemini.

### US2.2 - Play a Recommendation from the Real Catalog

**Persona**: P1 Listener  
**Requirements**: Slice 2 recommendation requirements; FR-G02, FR-G04

**As a** listener, **I want** AI recommendations to reference songs that DMPTiFy actually has **so that** every recommendation can be played immediately.

#### Acceptance Criteria

- **Given** a valid mood analysis, **when** recommendations are built, **then** every returned song exists in the persisted catalog and matches the approved filtering rules.
- **Given** Gemini suggests an unknown song ID, **when** the backend resolves recommendations, **then** the unknown ID is rejected or excluded and never appears as playable data.
- **Given** the listener selects a recommended song, **when** the existing AI card triggers playback, **then** the current store/player starts that persisted song from the beginning.

### US2.3 - Demonstrate AI Failure and Fake Modes Safely

**Persona**: P3 Project Operator/Tester  
**Requirements**: FR-G03, FR-G05; Slice 2 failure acceptance; NFR-01, NFR-02

**As a** project operator, **I want** deterministic fake Gemini responses and bounded provider failures **so that** AI integration can be tested without paid credentials or hanging the demo.

#### Acceptance Criteria

- **Given** fake mode, **when** a known test prompt is submitted, **then** the same valid response and catalog recommendations are produced deterministically.
- **Given** provider mode lacks required secrets, **when** the server starts, **then** it fails fast.
- **Given** Gemini times out, rejects quota, or returns invalid output, **when** the API handles the failure, **then** it returns a safe structured error with correlation ID and no prompt/token leakage.
- **Given** retries are enabled for a safe provider call, **when** failures persist, **then** attempts remain bounded and do not amplify traffic indefinitely.

## Slice 3 - Google OAuth 2.0 and JWT Session

### US3.1 - Sign In with Google

**Persona**: P2 Authenticated/VIP Listener  
**Requirements**: Slice 3 Google verification requirements; NFR-01

**As an** authenticated listener, **I want** to sign in with Google through a minimal modal **so that** I can establish a DMPTiFy account without creating another password.

#### Acceptance Criteria

- **Given** a valid Google ID token, **when** it is submitted, **then** the backend verifies signature, issuer, audience, expiry, and required identity claims before upserting the user.
- **Given** successful verification, **when** the session is issued, **then** the access JWT is stored only in the approved HttpOnly/SameSite cookie and is not returned to frontend JavaScript.
- **Given** an invalid, expired, wrong-audience, or wrong-issuer token, **when** authentication is attempted, **then** the request fails closed without creating a user or session.

### US3.2 - View Authenticated Identity and VIP Status

**Persona**: P2 Authenticated/VIP Listener  
**Requirements**: Slice 3 user/VIP requirements; FR-G04

**As an** authenticated listener, **I want** the existing profile area to show my safe identity and VIP status **so that** I know which account and entitlement are active.

#### Acceptance Criteria

- **Given** a valid session cookie, **when** the frontend loads the current-user endpoint, **then** it receives only the approved safe user/VIP projection.
- **Given** a missing, invalid, or expired JWT, **when** a protected endpoint is requested, **then** access is denied consistently.
- **Given** VIP state changes after confirmed payment, **when** current-user data is refreshed, **then** the existing profile/VIP presentation reflects the persisted entitlement.

### US3.3 - End and Verify Session Protection

**Persona**: P2 Authenticated/VIP Listener and P3 Project Operator/Tester  
**Requirements**: Slice 3 logout and E2E acceptance; SECURITY-08, SECURITY-12

**As an** authenticated listener, **I want** to log out securely **so that** the browser can no longer use my prior session.

#### Acceptance Criteria

- **Given** an active session, **when** logout succeeds, **then** the session cookie is expired or invalidated and protected requests are rejected afterward.
- **Given** frontend and backend use different local origins, **when** credentialed requests occur, **then** only the configured frontend origin is allowed.
- **Given** repeated invalid authentication attempts, **when** the rate limit is exceeded, **then** the endpoint throttles further attempts without leaking token details.
- **Given** E2E tests run, **when** they create the Nest application, **then** they exercise the same prefix, validation, cookies, CORS, and security middleware as runtime bootstrap.

## Slice 4 - VNPay Sandbox VIP Payment

### US4.1 - Start a 49,000 VND VIP Payment

**Persona**: P2 Authenticated/VIP Listener  
**Requirements**: Slice 4 create-payment requirements; SECURITY-05, SECURITY-11

**As an** authenticated listener, **I want** the existing VIP CTA to open a signed VNPay Sandbox payment **so that** I can request the defined VIP upgrade securely.

#### Acceptance Criteria

- **Given** an authenticated non-VIP listener, **when** the VIP CTA creates a payment, **then** the server creates one pending transaction for the server-owned amount of 49,000 VND.
- **Given** payment parameters, **when** the VNPay URL is generated, **then** canonicalization, encoding, ordering, and HMAC-SHA512 signature match the approved contract.
- **Given** a client attempts to alter amount or order data, **when** the request is processed, **then** client-owned values cannot override the server-owned package.
- **Given** an unauthenticated request, **when** payment creation is attempted, **then** it is denied.

### US4.2 - Receive VIP Only After Verified Payment

**Persona**: P2 Authenticated/VIP Listener  
**Requirements**: Slice 4 IPN and transaction requirements; FR-G05, FR-G06

**As an** authenticated listener, **I want** VIP to activate only after VNPay confirmation **so that** my entitlement accurately reflects a verified payment.

#### Acceptance Criteria

- **Given** a valid signed successful IPN matching a pending 49,000 VND transaction, **when** it is processed, **then** payment success and VIP activation commit atomically.
- **Given** an invalid signature, amount mismatch, missing transaction, or invalid state, **when** the IPN is processed, **then** VIP is not granted and a provider-compatible result is returned.
- **Given** a duplicate valid IPN, **when** it is replayed, **then** the persisted outcome remains equivalent to one successful processing.
- **Given** current-user data is refreshed after confirmation, **when** the frontend receives the user view, **then** the existing VIP presentation shows active status.

### US4.3 - Reproduce Payment Integrity Evidence

**Persona**: P3 Project Operator/Tester  
**Requirements**: Slice 4 test acceptance; NFR-04; PBT-03, PBT-07, PBT-08, PBT-09

**As a** project tester, **I want** deterministic signature and replay evidence **so that** I can prove the payment integration rejects tampering and remains idempotent.

#### Acceptance Criteria

- **Given** approved known parameters and secret, **when** the signature unit test runs, **then** it produces the pinned expected HMAC.
- **Given** generated domain-valid VNPay parameter maps, **when** canonicalization PBT runs, **then** ordering/signature invariants hold and failures report reproducible seeds and shrunk inputs.
- **Given** duplicate or concurrent IPN requests, **when** E2E tests execute them, **then** only one entitlement transition and one invoice intent can occur.
- **Given** logs are inspected, **when** payment scenarios run, **then** they contain correlation and transaction references but no signing secret or sensitive token.

## Slice 5 - Resend VIP Invoice Email

### US5.1 - Receive One VIP Invoice

**Persona**: P2 Authenticated/VIP Listener  
**Requirements**: Slice 5 invoice requirements; FR-G06

**As a** VIP listener, **I want** one invoice sent to my verified Google email **so that** I have evidence of the confirmed upgrade.

#### Acceptance Criteria

- **Given** a successful committed VIP payment, **when** the invoice workflow starts, **then** it uses the verified user email and persisted payment facts rather than client input.
- **Given** Resend accepts delivery, **when** delivery state is recorded, **then** it is associated uniquely with the payment transaction.
- **Given** the successful IPN is replayed, **when** the invoice workflow is evaluated again, **then** no duplicate invoice intent or send is created.

### US5.2 - Retry Email Without Reverting VIP

**Persona**: P3 Project Operator/Tester  
**Requirements**: Slice 5 failure requirements; NFR-02

**As a** project operator, **I want** failed invoice delivery to retry independently **so that** a temporary email outage does not undo a valid payment or create duplicates.

#### Acceptance Criteria

- **Given** Resend is unavailable after payment commits, **when** delivery fails, **then** VIP remains active and delivery is recorded as retryable failure.
- **Given** a retryable failure, **when** retry executes, **then** attempts are bounded, use the same idempotency identity, and never create another invoice intent.
- **Given** fake Resend mode, **when** payment-to-email E2E runs, **then** the test observes exactly one delivery request without external credentials.
- **Given** a permanent provider rejection, **when** retries are exhausted or not allowed, **then** the failure is visible through safe logs/status for operator action.

## Persona-to-Story Map

| Persona | Stories |
|---|---|
| P1 Listener | US1.1, US1.2, US1.3, US2.1, US2.2, US2.3 |
| P2 Authenticated/VIP Listener | US3.1, US3.2, US3.3, US4.1, US4.2, US5.1 |
| P3 Project Operator/Tester | US1.4, US2.3, US3.3, US4.3, US5.2 |

## INVEST Verification

| Check | Verification |
|---|---|
| Independent | Each story has one observable behavior; shared slice prerequisites are explicit rather than hidden |
| Negotiable | Stories specify outcomes and contracts, not internal class structure |
| Valuable | Every story names listener or operator value |
| Estimable | Scope and acceptance boundaries are concrete |
| Small | Stories are tracer-bullet sized rather than whole-slice epics |
| Testable | Every story includes observable Given/When/Then evidence |

## Requirements and Extension Traceability

- Slice 1 stories cover catalog, playlist, HTTP Range, provider configuration, and Range PBT.
- Slice 2 stories cover validated Gemini function output, real catalog recommendations, and bounded failure behavior.
- Slice 3 stories cover Google verification, secure cookie sessions, current-user/VIP projection, logout, CORS, and throttling.
- Slice 4 stories cover server-owned payment creation, HMAC verification, atomic entitlement, replay protection, audit evidence, and PBT.
- Slice 5 stories cover verified-recipient invoicing, email idempotency, independent failure, and bounded retry.
- Security and Resiliency criteria are embedded in the value stories where behavior is observable; infrastructure-only future requirements remain in the approved NFRs.
