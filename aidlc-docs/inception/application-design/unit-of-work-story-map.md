# Unit of Work Story Map

## Complete Story Assignment

| Story | Persona | Owning unit | Observable outcome |
|---|---|---|---|
| US1.1 | P1 Listener | Unit 1 | Persisted songs render in existing catalog |
| US1.2 | P1 Listener | Unit 1 | Persisted playlist membership/counts drive UI |
| US1.3 | P1 Listener | Unit 1 | HTTP Range streaming and seeking work |
| US1.4 | P3 Operator/Tester | Unit 1 | Repeatable local/provider catalog/media demo |
| US2.1 | P1 Listener | Unit 2 | Valid mood/BPM/reply analysis |
| US2.2 | P1 Listener | Unit 2 | Recommendations resolve playable persisted songs |
| US2.3 | P3 Operator/Tester | Unit 2 | Deterministic fake and bounded provider failures |
| US3.1 | P2 Authenticated Listener | Unit 3 | Secure Google login and session issuance |
| US3.2 | P2 Authenticated/VIP Listener | Unit 3 | Current identity/VIP state appears in profile |
| US3.3 | P2 and P3 | Unit 3 | Logout, guard, CORS, throttle, bootstrap evidence |
| US4.1 | P2 Authenticated Listener | Unit 4 | Signed fixed-price VNPay payment starts |
| US4.2 | P2 Authenticated/VIP Listener | Unit 4 | Verified IPN atomically activates VIP |
| US4.3 | P3 Operator/Tester | Unit 4 | HMAC/PBT/replay integrity evidence |
| US5.1 | P2 VIP Listener | Unit 5 | Exactly one verified-recipient invoice intent |
| US5.2 | P3 Operator/Tester | Unit 5 | Email retry cannot revert VIP or duplicate invoice |

## Unit Story Groups

### Unit 1

- US1.1 Browse the Persisted Song Catalog.
- US1.2 Browse Persisted Playlists.
- US1.3 Stream and Seek Audio Reliably.
- US1.4 Run a Deterministic Catalog and Media Demo.

### Unit 2

- US2.1 Describe a Mood and Receive a Valid Analysis.
- US2.2 Play a Recommendation from the Real Catalog.
- US2.3 Demonstrate AI Failure and Fake Modes Safely.

### Unit 3

- US3.1 Sign In with Google.
- US3.2 View Authenticated Identity and VIP Status.
- US3.3 End and Verify Session Protection.

### Unit 4

- US4.1 Start a 49,000 VND VIP Payment.
- US4.2 Receive VIP Only After Verified Payment.
- US4.3 Reproduce Payment Integrity Evidence.

### Unit 5

- US5.1 Receive One VIP Invoice.
- US5.2 Retry Email Without Reverting VIP.

## Coverage Validation

- **Stories defined**: 15.
- **Stories assigned**: 15.
- **Stories unassigned**: 0.
- **Stories assigned to multiple owning units**: 0.
- **Units**: exactly 5.
- **Unit with no user/operator story**: 0.

## Extension Ownership Map

| Unit | Security focus | Resiliency focus | Partial PBT focus |
|---|---|---|---|
| Unit 1 | validation, media path safety, headers/config | health, DB/media timeout, deterministic startup | RangeParser invariants/generators/replay |
| Unit 2 | bounded input/output, secret/prompt redaction | provider timeout/retry/degradation | N/A under approved partial scope |
| Unit 3 | token verification, cookie/session, CORS, throttling | auth dependency health/fail-closed behavior | N/A under approved partial scope |
| Unit 4 | HMAC, server-owned amount, auth, audit integrity | transaction/idempotency/replay isolation | VNPay canonicalization/signature invariants |
| Unit 5 | verified recipient, provider secret, safe logs | transactional outbox, bounded retry, no entitlement rollback | N/A under approved partial scope |

## Frontend Scope Map

| Unit | Approved frontend change |
|---|---|
| Unit 1 | API client, store/catalog hydration, playlist data, stable backend audio URLs |
| Unit 2 | Replace AI timeout/keyword data source only |
| Unit 3 | Minimal Google modal and existing profile/current-user state |
| Unit 4 | Wire existing VIP CTA and refresh VIP state |
| Unit 5 | No required new primary UI; operator evidence through backend/tests/logs |

No unit owns a page redesign, new dashboard, native application, microservice, or unrelated UI feature.
