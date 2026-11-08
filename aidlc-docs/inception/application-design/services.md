# Service Definitions and Orchestration

## Shared Request Pipeline

Every HTTP request passes through correlation ID, safe logging context, rate limiting where applicable, cookie parsing, DTO validation, authentication/authorization where required, controller delegation, and global safe error mapping. Runtime and E2E tests use the same application factory.

## Slice 1 Orchestration

### Catalog Query

1. Controller validates filter/path DTO.
2. Catalog service queries repositories.
3. Repository returns persisted records and membership-derived counts.
4. Service maps records to OpenAPI response projections.
5. Frontend API client hydrates the existing store/UI.

### Media Delivery

1. Controller receives song ID and optional Range header.
2. Media service resolves song media metadata through CatalogQuery.
3. Local mode obtains byte length, parses range, and opens a bounded stream.
4. Cloudinary mode produces a short-lived signed redirect; CDN handles byte ranges.
5. Controller writes the delivery-result headers/status without embedding file logic.

## Slice 2 Orchestration

1. AI controller validates a bounded message.
2. AI service calls selected MoodAnalysisPort with timeout/correlation context.
3. Provider output is validated against the supported mood/function schema.
4. CatalogQuery resolves persisted recommendations by mood/BPM.
5. Service returns safe reply, mood, BPM, and real Song views.
6. Existing AI drawer renders the response and invokes existing playback actions.

Degraded behavior is an explicit safe error; provider mode never swaps silently to fake output.

## Slice 3 Orchestration

### Google Login

1. Auth controller validates the ID-token request.
2. Google verifier checks signature, issuer, audience, expiry, and identity claims.
3. Auth service upserts User using provider subject as stable identity.
4. Session service creates AuthSession and signs JWT with `sub` and `sid`.
5. Controller sets approved HttpOnly/SameSite/Secure cookie and returns safe user/VIP view.

### Protected Request and Logout

1. Guard verifies JWT signature/claims.
2. Guard loads active AuthSession by `sid` and confirms user association/expiry/revocation.
3. Logout revokes that session and expires the cookie.

## Slice 4 Orchestration

### Create Payment

1. JWT guard supplies authenticated user.
2. Payment service creates a unique pending transaction using server-owned package and amount.
3. VNPay adapter canonicalizes/signs approved parameters and returns sandbox URL.
4. Existing VIP CTA redirects the browser.

### Process IPN

1. Public IPN route is rate limited and validates bounded query DTO.
2. VNPay adapter verifies signature and normalizes provider facts.
3. A database transaction locks the payment reference.
4. Service verifies amount, state, and provider result.
5. First valid success marks payment succeeded, activates VIP, and inserts one `VipPaymentConfirmed` outbox event atomically.
6. Duplicate success returns the stored idempotent outcome without repeating mutations.
7. Transaction commits before any email provider call.

## Slice 5 Orchestration

1. In-process worker periodically claims pending outbox rows with concurrency-safe locking.
2. Invoice service creates EmailDelivery if absent using payment reference as idempotency identity.
3. Resend/fake adapter receives verified email and persisted invoice facts.
4. Success marks EmailDelivery sent and OutboxEvent processed.
5. Retryable failure records safe reason and next attempt with bounded backoff.
6. Permanent/exhausted failure marks terminal state for operator action.
7. Payment/VIP state is never rolled back by notification failure.

## Transaction Boundaries

- Catalog reads are non-transactional consistent queries unless a future use case requires stronger isolation.
- Google user upsert plus AuthSession creation uses one transaction where supported.
- VNPay success, VIP activation, and outbox insert use one transaction with a locked payment row.
- Email delivery occurs after commit in a separate worker transaction.
- Provider network calls are not performed while holding the payment database transaction.

## Retry, Timeout, and Idempotency Policy

- Every external call has an explicit timeout.
- Retry applies only to classified transient failures and safe/idempotent operations.
- Google login and payment creation are not blindly retried by the server.
- IPN is idempotent by unique transaction/provider references and locked state transition.
- Invoice dispatch uses payment-derived idempotency keys and unique delivery constraints.
- Exact retry counts/backoff values are finalized in per-unit NFR Design.

## TDD Seams

- RangeParser and VnPayCanonicalizer are pure deep modules with narrow interfaces and partial PBT.
- Provider ports are system boundaries and may use deterministic fakes.
- Services are tested through public module/HTTP interfaces rather than mocked internal collaborators.
- Payment-to-outbox and outbox-to-email have separate observable integration seams.
