import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { AppConfigService } from '../../config/env.config.js';

export interface GoogleUserProfile {
  googleId: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
}

interface GoogleTokenInfoResponse {
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
  aud?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Injectable()
export class GoogleOAuthService {
  constructor(
    @Inject(AppConfigService) private readonly config: AppConfigService,
  ) {}

  private parseMockToken(idToken: string): GoogleUserProfile {
    const body = idToken.slice('mock-google:'.length);
    const separatorIndex = body.indexOf(':');
    const rawEmail = separatorIndex === -1 ? body : body.slice(0, separatorIndex);
    const rawName = separatorIndex === -1 ? '' : body.slice(separatorIndex + 1);

    const email = rawEmail.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email)) {
      throw new UnauthorizedException('Invalid mock Google token email');
    }

    const fullName = rawName.trim() || email.split('@')[0];
    return {
      googleId: `mock-google:${email}`,
      email,
      fullName,
      avatarUrl: null,
    };
  }

  async verifyIdToken(idToken: string): Promise<GoogleUserProfile> {
    const trimmed = typeof idToken === 'string' ? idToken.trim() : '';
    if (!trimmed) {
      throw new UnauthorizedException('Google ID token is required');
    }

    const isSandboxAllowed = !this.config.googleClientId || this.config.nodeEnv !== 'production';
    if (trimmed.startsWith('mock-google:')) {
      if (!isSandboxAllowed) {
        throw new UnauthorizedException('Mock Google login is disabled in production');
      }
      return this.parseMockToken(trimmed);
    }

    let response: Response;
    try {
      const endpoint = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(trimmed)}`;
      response = await fetch(endpoint);
    } catch {
      throw new UnauthorizedException('Failed to reach Google token verification service');
    }

    if (!response.ok) {
      throw new UnauthorizedException('Invalid Google ID token');
    }

    const data = (await response.json()) as GoogleTokenInfoResponse;
    if (!data.sub || !data.email) {
      throw new UnauthorizedException('Google token is missing required user claims');
    }

    if (data.email_verified === false || data.email_verified === 'false') {
      throw new UnauthorizedException('Google email is not verified');
    }

    if (this.config.googleClientId && data.aud && data.aud !== this.config.googleClientId) {
      throw new UnauthorizedException('Google token audience mismatch');
    }

    const normalizedEmail = data.email.trim().toLowerCase();
    return {
      googleId: data.sub,
      email: normalizedEmail,
      fullName: data.name?.trim() || normalizedEmail.split('@')[0],
      avatarUrl: data.picture ?? null,
    };
  }
}
