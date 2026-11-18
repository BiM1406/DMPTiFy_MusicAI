import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
  AuthenticatedUser,
  PlanTier,
  UserRole,
} from '../../common/types/domain.types.js';
import { AppConfigService } from '../../config/env.config.js';

export interface JwtClaims {
  sub: string;
  email: string;
  fullName: string;
  role: UserRole;
  planTier: PlanTier;
  vipExpiresAt: string | null;
  avatarUrl: string | null;
  iat: number;
  exp: number;
}

type SignableUser =
  | AuthenticatedUser
  | (Omit<AuthenticatedUser, 'id'> & { id?: string; sub?: string });

@Injectable()
export class JwtTokenService {
  constructor(
    @Inject(AppConfigService) private readonly config: AppConfigService,
  ) {}

  private computeSignature(signingInput: string): string {
    return createHmac('sha256', this.config.jwtSecret)
      .update(signingInput, 'utf8')
      .digest('base64url');
  }

  sign(user: SignableUser, expiresInSeconds?: number): string {
    const sub = 'id' in user && user.id ? user.id : (user as { sub?: string }).sub;
    if (!sub) {
      throw new Error('JWT subject (user.id or sub) is required');
    }

    const now = Math.floor(Date.now() / 1000);
    const ttl = expiresInSeconds ?? this.config.jwtExpiresInSeconds ?? 86400;

    const header = { alg: 'HS256', typ: 'JWT' };
    const payload: JwtClaims = {
      sub,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      planTier: user.planTier,
      vipExpiresAt: user.vipExpiresAt ?? null,
      avatarUrl: user.avatarUrl ?? null,
      iat: now,
      exp: now + ttl,
    };

    const encodedHeader = Buffer.from(JSON.stringify(header), 'utf8').toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const signature = this.computeSignature(signingInput);

    return `${signingInput}.${signature}`;
  }

  verify(token: string): JwtClaims {
    if (typeof token !== 'string' || !token) {
      throw new UnauthorizedException('Missing authentication token');
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedException('Malformed authentication token');
    }

    const [encodedHeader, encodedPayload, providedSignature] = parts;
    const expectedSignature = this.computeSignature(`${encodedHeader}.${encodedPayload}`);

    const providedBuf = Buffer.from(providedSignature, 'utf8');
    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    if (
      providedBuf.length !== expectedBuf.length ||
      !timingSafeEqual(providedBuf, expectedBuf)
    ) {
      throw new UnauthorizedException('Invalid token signature');
    }

    let header: { alg?: unknown };
    let payload: JwtClaims;
    try {
      header = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString('utf8')) as {
        alg?: unknown;
      };
      payload = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString('utf8'),
      ) as JwtClaims;
    } catch {
      throw new UnauthorizedException('Invalid token payload');
    }

    if (header.alg !== 'HS256' || typeof payload.sub !== 'string' || typeof payload.exp !== 'number') {
      throw new UnauthorizedException('Invalid token claims');
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) {
      throw new UnauthorizedException('Authentication token expired');
    }

    return payload;
  }
}
