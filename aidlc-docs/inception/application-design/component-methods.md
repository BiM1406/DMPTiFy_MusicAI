# Component Methods

Signatures are design-level TypeScript contracts. Detailed algorithms, DTO fields, retry schedules, and transaction rules are finalized in per-unit Functional/NFR Design.

## Shared Platform

```ts
createApplication(options: ApplicationOptions): Promise<INestApplication>
configureApplication(app: INestApplication, config: AppConfig): Promise<void>
loadAndValidateConfig(env: NodeJS.ProcessEnv): AppConfig
runInTransaction<T>(work: (tx: TransactionContext) => Promise<T>): Promise<T>
createApiError(error: unknown, correlationId: string): SafeApiError
getLiveness(): HealthResult
getReadiness(): Promise<ReadinessResult>
```

## CatalogModule

```ts
interface CatalogQuery {
  listSongs(filter?: SongFilter): Promise<SongView[]>;
  getSong(songId: string): Promise<SongView>;
  listPlaylists(): Promise<PlaylistSummaryView[]>;
  getPlaylist(playlistId: string): Promise<PlaylistDetailView>;
  findRecommendations(input: RecommendationFilter): Promise<SongView[]>;
}

interface SongRepository {
  findMany(filter?: SongFilter): Promise<SongRecord[]>;
  findById(songId: string): Promise<SongRecord | null>;
}

interface PlaylistRepository {
  findManyWithCounts(): Promise<PlaylistRecord[]>;
  findByIdWithSongs(playlistId: string): Promise<PlaylistRecord | null>;
}
```

## MediaModule

```ts
interface MediaService {
  resolveDelivery(songId: string, rangeHeader?: string): Promise<MediaDelivery>;
}

interface RangeParser {
  parse(rangeHeader: string | undefined, totalBytes: number): ByteRangeResult;
}

interface MediaStoragePort {
  stat(mediaKey: string): Promise<MediaMetadata>;
  openLocalStream(mediaKey: string, range?: ByteRange): Promise<Readable>;
  createSignedRedirect(mediaKey: string, ttlSeconds: number): Promise<URL>;
}
```

`MediaDelivery` is a discriminated result: local full stream, local partial stream, signed redirect, or range-not-satisfiable response.

## AiModule

```ts
interface AiAnalysisService {
  analyzeMood(input: AnalyzeMoodInput): Promise<AnalyzeMoodResult>;
}

interface MoodAnalysisPort {
  analyze(input: MoodProviderInput, context: ProviderContext): Promise<MoodProviderResult>;
}

interface MoodOutputValidator {
  validate(result: unknown): ValidatedMoodAnalysis;
}
```

The service validates provider output, then asks `CatalogQuery.findRecommendations` to resolve real songs.

## AuthModule

```ts
interface AuthService {
  authenticateGoogle(input: GoogleLoginInput, context: RequestContext): Promise<AuthResult>;
  getCurrentUser(principal: AuthPrincipal): Promise<CurrentUserView>;
  logout(principal: AuthPrincipal): Promise<void>;
}

interface GoogleTokenVerifierPort {
  verifyIdToken(idToken: string): Promise<VerifiedGoogleIdentity>;
}

interface SessionService {
  issue(userId: string, context: SessionContext): Promise<IssuedSession>;
  validate(jwt: string): Promise<AuthPrincipal>;
  revoke(sessionId: string, userId: string): Promise<void>;
}

interface AuthSessionRepository {
  create(session: NewAuthSession): Promise<AuthSessionRecord>;
  findActive(sessionId: string): Promise<AuthSessionRecord | null>;
  revoke(sessionId: string, revokedAt: Date): Promise<void>;
}
```

JWT includes `sub` and `sid`; validation checks cryptographic claims and the active AuthSession record.

## PaymentModule

```ts
interface PaymentService {
  createVipPayment(user: AuthPrincipal, request: CreatePaymentInput): Promise<PaymentRedirectView>;
  processIpn(query: VnPayIpnInput, context: RequestContext): Promise<VnPayIpnResult>;
}

interface VnPayPort {
  createSignedPaymentUrl(input: VnPayPaymentInput): URL;
  verifyIpn(input: VnPayIpnInput): VerifiedVnPayIpn;
}

interface VnPayCanonicalizer {
  canonicalize(parameters: Record<string, string>): string;
  sign(canonical: string, secret: string): string;
  verify(canonical: string, signature: string, secret: string): boolean;
}

interface PaymentRepository {
  createPending(input: NewPayment, tx: TransactionContext): Promise<PaymentRecord>;
  findByReferenceForUpdate(reference: string, tx: TransactionContext): Promise<PaymentRecord | null>;
  markSucceeded(id: string, providerFacts: ProviderPaymentFacts, tx: TransactionContext): Promise<void>;
}

interface OutboxWriterPort {
  enqueue(event: NewOutboxEvent, tx: TransactionContext): Promise<void>;
}
```

## NotificationModule

```ts
interface OutboxWorker {
  runBatch(limit: number): Promise<OutboxBatchResult>;
  processEvent(eventId: string): Promise<OutboxProcessResult>;
}

interface InvoiceService {
  dispatchVipInvoice(event: VipPaymentConfirmedEvent): Promise<EmailDeliveryResult>;
}

interface InvoiceEmailPort {
  sendVipInvoice(input: VipInvoiceEmail, idempotencyKey: string): Promise<ProviderEmailResult>;
}

interface OutboxRepository {
  claimPending(limit: number, now: Date): Promise<OutboxEventRecord[]>;
  markProcessed(id: string, processedAt: Date): Promise<void>;
  scheduleRetry(id: string, nextAttemptAt: Date, safeReason: string): Promise<void>;
  markDead(id: string, safeReason: string): Promise<void>;
}

interface EmailDeliveryRepository {
  createIfAbsent(input: NewEmailDelivery): Promise<EmailDeliveryRecord>;
  markSent(id: string, providerId: string, sentAt: Date): Promise<void>;
  markFailed(id: string, safeReason: string): Promise<void>;
}
```

## Frontend API Client

```ts
interface DmptifyApiClient {
  listSongs(): Promise<SongView[]>;
  listPlaylists(): Promise<PlaylistSummaryView[]>;
  analyzeMood(message: string): Promise<AnalyzeMoodResult>;
  authenticateGoogle(idToken: string): Promise<CurrentUserView>;
  getCurrentUser(): Promise<CurrentUserView>;
  logout(): Promise<void>;
  createVipPayment(): Promise<PaymentRedirectView>;
}
```

All requests send credentials through one client boundary and map safe API errors into UI-consumable states.
