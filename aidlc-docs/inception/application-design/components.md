# Application Components

## Architecture Style

DMPTiFy uses one NestJS modular monolith organized by feature capability, with a small shared platform layer. Feature modules own their controllers, application services, persistence models/repositories, and provider ports. Infrastructure adapters implement ports and depend inward on feature contracts.

## Shared Platform Components

### Bootstrap and HTTP Platform

- **Purpose**: create the Nest application consistently for runtime and E2E tests.
- **Responsibilities**: `/api` prefix, global validation, safe exception mapping, restricted CORS, cookies, security headers, request limits, rate limiting, correlation IDs, OpenAPI, and graceful shutdown.
- **Interface**: `configureApplication(app, config)` and `createApplication(options)`.

### Configuration

- **Purpose**: provide fail-fast typed environment configuration.
- **Responsibilities**: validate ports, database, frontend origins, JWT, provider mode, provider credentials, media mode, timeouts, retry limits, and cookie policy.
- **Rule**: provider mode never silently falls back to fake adapters.

### Database

- **Purpose**: own TypeORM DataSource configuration, migrations, transactions, and health checks.
- **Responsibilities**: PostgreSQL connection lifecycle, migration execution, transaction boundary helpers, and test database isolation.

### Observability and Error Handling

- **Purpose**: produce safe structured diagnostics.
- **Responsibilities**: correlation IDs, structured logs, redaction, safe API errors, provider error classification, and security/audit events.

### Health

- **Purpose**: expose process liveness and dependency readiness.
- **Responsibilities**: shallow health plus database/provider configuration readiness without exposing secrets.

### API Contract/OpenAPI

- **Purpose**: make server DTOs the runtime validation source and OpenAPI the language-neutral contract source.
- **Responsibilities**: publish schema, generate/derive frontend types/client, and detect contract drift in CI.

## Slice 1 Components

### CatalogModule

- **Purpose**: serve persisted songs and playlists.
- **Owns**: Song, Playlist, PlaylistSong entities and repositories.
- **Responsibilities**: catalog queries, playlist membership/counts, seed orchestration, and safe API projections.
- **Public interfaces**: song list/detail lookup and playlist list/detail lookup.

### MediaModule

- **Purpose**: deliver playable audio through one stable endpoint.
- **Owns**: range parsing/formatting and media delivery orchestration.
- **Ports**: `MediaStoragePort`.
- **Adapters**:
  - Local media adapter opens a bounded file stream and supports full/partial delivery.
  - Cloudinary adapter creates a short-lived signed redirect; the CDN handles Range.
- **Dependency**: reads song media metadata through a narrow Catalog query interface.

## Slice 2 Components

### AiModule

- **Purpose**: analyze listener text and return catalog-backed recommendations.
- **Ports**: `MoodAnalysisPort` with Gemini and deterministic fake adapters.
- **Responsibilities**: input validation, provider orchestration, output schema validation, mood/BPM normalization, catalog resolution, and safe errors.
- **Dependency**: read-only Catalog recommendation interface.

## Slice 3 Components

### AuthModule

- **Purpose**: verify Google identity, own users and sessions, and protect routes.
- **Owns**: User and AuthSession entities/repositories.
- **Ports**: `GoogleTokenVerifierPort`, `JwtCodecPort`, clock/ID boundaries where needed.
- **Responsibilities**: Google login, user upsert, session issuance, JWT validation, session revocation, current-user projection, logout, guards, and cookie policy.

## Slice 4 Components

### PaymentModule

- **Purpose**: create and reconcile VNPay Sandbox VIP payments.
- **Owns**: PaymentTransaction entity/repository and payment/VIP transaction orchestration.
- **Ports**: `VnPayPort`, `OutboxWriterPort`.
- **Responsibilities**: server-owned package/amount, canonicalization/signature verification, pending transaction creation, IPN validation, atomic success/VIP mutation, idempotency, and audit facts.
- **Dependencies**: authenticated user identity from Auth; shared database transaction boundary.

## Slice 5 Components

### NotificationModule

- **Purpose**: dispatch invoice events after payment commit without coupling email failure to entitlement.
- **Owns**: OutboxEvent and EmailDelivery entities/repositories.
- **Ports**: `InvoiceEmailPort` with Resend and deterministic fake adapters.
- **Responsibilities**: claim pending outbox events, create idempotent delivery state, send invoice, classify failure, schedule bounded retry, and mark terminal state.
- **Dependency**: consumes persisted event payloads; it does not call PaymentModule synchronously.

## Frontend Integration Components

### Typed API Client

- **Purpose**: centralize API base URL, credentials, request/error handling, and OpenAPI-derived types.
- **Responsibilities**: catalog, playlist, AI, auth, payment, and current-user calls.

### Existing UI Integration Seams

- `MainContent` and store load catalog/playlists through the API client.
- `BottomPlayer` keeps its browser audio ownership and receives stable backend audio URLs.
- `AiChatDrawer` replaces local timeout/keyword behavior with the AI API.
- `TopNav` profile area and a minimal modal host Google sign-in/current-user state.
- `Sidebar` VIP CTA requests a VNPay URL and redirects the browser.
- No new dashboard or visual system is introduced.

## Cross-Cutting Ownership Rules

- Controllers validate transport and delegate; they do not contain business rules.
- Feature application services own orchestration.
- Repositories hide TypeORM details from services.
- Provider adapters never mutate domain state directly.
- Payment transaction owns VIP mutation; Notification only observes committed outbox events.
- Frontend never calls Google, VNPay, Gemini, Cloudinary, or Resend with server secrets.
