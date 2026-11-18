import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Global, Injectable, Module } from '@nestjs/common';

export type DbMode = 'auto' | 'mysql' | 'memory';

export interface ValidatedEnv {
  port: number;
  nodeEnv: string;
  frontendUrl: string;
  databaseUrl: string;
  dbMode: DbMode;
  jwtSecret: string;
  jwtExpiresInSeconds: number;
  googleClientId: string;
  geminiApiKey: string;
  geminiModel: string;
  youtubeApiKey: string;
  vnpayTmnCode: string;
  vnpayHashSecret: string;
  vnpayUrl: string;
  vnpayReturnUrl: string;
  cloudinaryCloudName: string;
  cloudinaryApiKey: string;
  cloudinaryApiSecret: string;
  resendApiKey: string;
  resendFromEmail: string;
}

const DEFAULT_JWT_SECRET = 'dmptify-dev-jwt-secret-change-in-prod-2026';
const DEFAULT_DATABASE_URL = 'mysql://root:root@localhost:3306/dmptify_db';
const DEFAULT_VNPAY_URL = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
const DEFAULT_VNPAY_RETURN_URL =
  'http://localhost:3001/api/v1/payments/vnpay/return';

function parseDotEnvFile(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) {
    return {};
  }
  const content = readFileSync(filePath, 'utf8');
  const parsed: Record<string, string> = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const normalized = trimmed.startsWith('export ')
      ? trimmed.slice('export '.length).trim()
      : trimmed;
    const eqIdx = normalized.indexOf('=');
    if (eqIdx <= 0) {
      continue;
    }
    const key = normalized.slice(0, eqIdx).trim();
    let value = normalized.slice(eqIdx + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key.length > 0) {
      parsed[key] = value;
    }
  }
  return parsed;
}

function loadMergedProcessEnv(): NodeJS.ProcessEnv {
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), 'BE', '.env'),
  ];
  const fileEnv: Record<string, string> = {};
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      Object.assign(fileEnv, parseDotEnvFile(candidate));
      break;
    }
  }
  return {
    ...fileEnv,
    ...process.env,
  };
}

function parsePositiveInt(
  raw: string | undefined,
  defaultValue: number,
  fieldName: string,
  max?: number,
): number {
  if (raw === undefined || raw.trim() === '') {
    return defaultValue;
  }
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(
      `Invalid ${fieldName}: expected positive integer, received "${raw}"`,
    );
  }
  const num = Number.parseInt(trimmed, 10);
  if (!Number.isSafeInteger(num) || num < 1 || (max !== undefined && num > max)) {
    throw new Error(
      `Invalid ${fieldName}: must be between 1 and ${max ?? 'MAX_SAFE_INTEGER'}, received "${raw}"`,
    );
  }
  return num;
}

function validateHttpUrl(raw: string, fieldName: string): string {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`Invalid ${fieldName}: "${raw}" is not a valid URL`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(
      `Invalid ${fieldName}: must use http or https protocol, received "${parsed.protocol}"`,
    );
  }
  return raw;
}

function validateMysqlUrl(raw: string): string {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`Invalid DATABASE_URL: "${raw}" is not a valid URL`);
  }
  if (parsed.protocol !== 'mysql:') {
    throw new Error(
      `Invalid DATABASE_URL: must start with mysql://, received "${parsed.protocol}"`,
    );
  }
  return raw;
}

export function loadAndValidateEnv(rawEnv?: NodeJS.ProcessEnv): ValidatedEnv {
  const env = rawEnv ?? loadMergedProcessEnv();

  const nodeEnv = (env.NODE_ENV ?? 'development').trim();
  if (
    nodeEnv !== 'development' &&
    nodeEnv !== 'production' &&
    nodeEnv !== 'test'
  ) {
    throw new Error(
      `Invalid NODE_ENV: expected development | production | test, received "${nodeEnv}"`,
    );
  }

  const port = parsePositiveInt(env.PORT, 3001, 'PORT', 65535);
  const frontendUrl = validateHttpUrl(
    (env.FRONTEND_URL ?? 'http://localhost:3000').trim(),
    'FRONTEND_URL',
  );
  const databaseUrl = validateMysqlUrl(
    (env.DATABASE_URL ?? DEFAULT_DATABASE_URL).trim(),
  );

  const rawDbMode = (env.DB_MODE ?? 'auto').trim();
  if (rawDbMode !== 'auto' && rawDbMode !== 'mysql' && rawDbMode !== 'memory') {
    throw new Error(
      `Invalid DB_MODE: expected auto | mysql | memory, received "${rawDbMode}"`,
    );
  }
  const dbMode: DbMode = rawDbMode;

  const jwtSecretRaw = env.JWT_SECRET?.trim();
  if (jwtSecretRaw !== undefined && jwtSecretRaw.length < 8) {
    throw new Error('Invalid JWT_SECRET: must be at least 8 characters');
  }
  if (
    nodeEnv === 'production' &&
    (!jwtSecretRaw || jwtSecretRaw === DEFAULT_JWT_SECRET || jwtSecretRaw.length < 16)
  ) {
    throw new Error(
      'Invalid JWT_SECRET: production requires a custom JWT_SECRET of at least 16 characters',
    );
  }
  const jwtSecret = jwtSecretRaw && jwtSecretRaw.length > 0 ? jwtSecretRaw : DEFAULT_JWT_SECRET;

  const jwtExpiresInSeconds = parsePositiveInt(
    env.JWT_EXPIRES_IN_SECONDS,
    86400,
    'JWT_EXPIRES_IN_SECONDS',
  );

  const vnpayUrl = validateHttpUrl(
    (env.VNPAY_URL ?? DEFAULT_VNPAY_URL).trim(),
    'VNPAY_URL',
  );
  const vnpayReturnUrl = validateHttpUrl(
    (env.VNPAY_RETURN_URL ?? DEFAULT_VNPAY_RETURN_URL).trim(),
    'VNPAY_RETURN_URL',
  );

  return {
    port,
    nodeEnv,
    frontendUrl,
    databaseUrl,
    dbMode,
    jwtSecret,
    jwtExpiresInSeconds,
    googleClientId: (env.GOOGLE_CLIENT_ID ?? '').trim(),
    geminiApiKey: (env.GEMINI_API_KEY ?? '').trim(),
    geminiModel: (env.GEMINI_MODEL ?? 'gemini-2.5-flash').trim() || 'gemini-2.5-flash',
    youtubeApiKey: (env.YOUTUBE_API_KEY ?? '').trim(),
    vnpayTmnCode: (env.VNPAY_TMN_CODE ?? 'DMPTIFY1').trim() || 'DMPTIFY1',
    vnpayHashSecret:
      (env.VNPAY_HASH_SECRET ?? 'DMPTIFY_SANDBOX_HASH_SECRET_2026').trim() ||
      'DMPTIFY_SANDBOX_HASH_SECRET_2026',
    vnpayUrl,
    vnpayReturnUrl,
    cloudinaryCloudName: (env.CLOUDINARY_CLOUD_NAME ?? '').trim(),
    cloudinaryApiKey: (env.CLOUDINARY_API_KEY ?? '').trim(),
    cloudinaryApiSecret: (env.CLOUDINARY_API_SECRET ?? '').trim(),
    resendApiKey: (env.RESEND_API_KEY ?? '').trim(),
    resendFromEmail:
      (env.RESEND_FROM_EMAIL ?? 'DMPTiFy <onboarding@resend.dev>').trim() ||
      'DMPTiFy <onboarding@resend.dev>',
  };
}

@Injectable()
export class AppConfigService {
  private readonly env: ValidatedEnv;

  constructor() {
    this.env = loadAndValidateEnv();
  }

  static fromRawEnv(rawEnv: NodeJS.ProcessEnv): AppConfigService {
    const instance = Object.create(AppConfigService.prototype) as AppConfigService;
    Object.assign(instance, { env: loadAndValidateEnv(rawEnv) });
    return instance;
  }

  get port(): number {
    return this.env.port;
  }

  get nodeEnv(): string {
    return this.env.nodeEnv;
  }

  get frontendUrl(): string {
    return this.env.frontendUrl;
  }

  get databaseUrl(): string {
    return this.env.databaseUrl;
  }

  get dbMode(): DbMode {
    return this.env.dbMode;
  }

  get jwtSecret(): string {
    return this.env.jwtSecret;
  }

  get jwtExpiresInSeconds(): number {
    return this.env.jwtExpiresInSeconds;
  }

  get googleClientId(): string {
    return this.env.googleClientId;
  }

  get geminiApiKey(): string {
    return this.env.geminiApiKey;
  }

  get geminiModel(): string {
    return this.env.geminiModel;
  }

  get youtubeApiKey(): string {
    return this.env.youtubeApiKey;
  }

  get vnpayTmnCode(): string {
    return this.env.vnpayTmnCode;
  }

  get vnpayHashSecret(): string {
    return this.env.vnpayHashSecret;
  }

  get vnpayUrl(): string {
    return this.env.vnpayUrl;
  }

  get vnpayReturnUrl(): string {
    return this.env.vnpayReturnUrl;
  }

  get cloudinaryCloudName(): string {
    return this.env.cloudinaryCloudName;
  }

  get cloudinaryApiKey(): string {
    return this.env.cloudinaryApiKey;
  }

  get cloudinaryApiSecret(): string {
    return this.env.cloudinaryApiSecret;
  }

  get resendApiKey(): string {
    return this.env.resendApiKey;
  }

  get resendFromEmail(): string {
    return this.env.resendFromEmail;
  }
}

@Global()
@Module({
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
