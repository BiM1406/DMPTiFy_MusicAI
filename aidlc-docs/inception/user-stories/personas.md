# DMPTiFy Personas

## Persona P1 - Listener

### Profile

- Uses DMPTiFy to find music that matches a current mood and listen without technical setup.
- May be anonymous and does not initially need persistent preferences or VIP access.
- Uses desktop or mobile browser and expects the existing player interface to remain familiar.

### Goals

- Browse songs and playlists quickly.
- Stream and seek audio reliably.
- Describe a mood naturally and receive useful recommendations.
- Understand recoverable errors without seeing technical details.

### Pain Points

- Choice paralysis when selecting music.
- Playback interruptions or seeking that restarts incorrectly.
- AI suggestions that invent unavailable songs.
- A redesigned interface that disrupts the existing demo experience.

### Relevant Stories

- US1.1, US1.2, US1.3
- US2.1, US2.2, US2.3

## Persona P2 - Authenticated/VIP Listener

### Profile

- A listener who signs in with Google and expects a secure session.
- May purchase the 49,000 VND VIP package through VNPay Sandbox.
- Expects VIP status and invoice delivery to reflect the confirmed payment accurately.

### Goals

- Sign in without creating another password.
- See correct identity and VIP status.
- Upgrade through a trustworthy payment flow.
- Receive exactly one invoice without losing VIP access if email delivery is delayed.
- Log out and end the browser session safely.

### Pain Points

- Tokens or personal information exposed to frontend code/logs.
- Payment shown as successful before VNPay verification.
- Duplicate charges, duplicate entitlement, or duplicate invoices.
- Email failure incorrectly rolling back a valid payment.

### Relevant Stories

- US3.1, US3.2, US3.3
- US4.1, US4.2
- US5.1

## Persona P3 - Project Operator/Tester

### Profile

- A CS445 team member who runs the demo, configures fake/sandbox providers, verifies integrations, and gathers quality evidence.
- Works locally and through GitHub Actions rather than operating a production cloud platform.

### Goals

- Start the application repeatably with seeded data.
- Switch explicitly between fake and sandbox/provider modes.
- Verify HTTP, provider, security, idempotency, retry, and failure behavior deterministically.
- Diagnose failures using correlation IDs and safe structured logs.
- Demonstrate passing lint, build, unit, E2E, and partial PBT gates.

### Pain Points

- Hidden fallback to fake providers.
- Tests that require real paid credentials.
- Green tests that do not exercise production bootstrap behavior.
- Non-reproducible property-test failures.
- Payment or email replays that mutate state twice.

### Relevant Stories

- US1.4
- US2.3
- US3.3
- US4.3
- US5.2
