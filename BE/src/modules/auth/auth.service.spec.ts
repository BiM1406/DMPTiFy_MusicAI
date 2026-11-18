import 'reflect-metadata';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppConfigModule, AppConfigService } from '../../config/env.config.js';
import { DatabaseModule } from '../../database/database.module.js';
import { DatabaseService } from '../../database/database.service.js';
import { UsersModule } from '../users/users.module.js';
import { UsersService } from '../users/users.service.js';
import { AuthController } from './auth.controller.js';
import { AuthModule } from './auth.module.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { JwtTokenService } from './jwt.service.js';

function createHttpExecutionContext(
  request: { headers?: Record<string, string>; user?: unknown },
): ExecutionContext {
  const handler = {};
  const controllerClass = {};
  return {
    getHandler: () => handler,
    getClass: () => controllerClass,
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('AuthService, JwtTokenService & Guards', () => {
  let authService: AuthService;
  let authController: AuthController;
  let usersService: UsersService;
  let jwtService: JwtTokenService;
  let jwtAuthGuard: JwtAuthGuard;
  let rolesGuard: RolesGuard;
  let database: DatabaseService;
  let reflector: Reflector;

  beforeEach(async () => {
    process.env.DB_MODE = 'memory';
    process.env.NODE_ENV = 'test';

    const moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, DatabaseModule, AuthModule, UsersModule],
    })
      .overrideProvider(AppConfigService)
      .useValue(
        AppConfigService.fromRawEnv({
          DB_MODE: 'memory',
          NODE_ENV: 'test',
          JWT_SECRET: 'vitest-jwt-secret-key-2026',
          JWT_EXPIRES_IN_SECONDS: '3600',
        }),
      )
      .compile();

    authService = moduleRef.get(AuthService);
    authController = moduleRef.get(AuthController);
    usersService = moduleRef.get(UsersService);
    jwtService = moduleRef.get(JwtTokenService);
    jwtAuthGuard = moduleRef.get(JwtAuthGuard);
    rolesGuard = moduleRef.get(RolesGuard);
    database = moduleRef.get(DatabaseService);
    reflector = moduleRef.get(Reflector);

    await database.resetForTesting();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers, logs in, and prevents duplicate email registration', async () => {
    const reg = await authService.register({
      email: 'NewUser@DTU.EDU.VN',
      password: 'password123',
      fullName: 'Nguyễn Văn A',
    });

    expect(reg.accessToken.split('.')).toHaveLength(3);
    expect(reg.user.email).toBe('newuser@dtu.edu.vn');
    expect(reg.user.fullName).toBe('Nguyễn Văn A');
    expect(reg.user.planTier).toBe('FREE');
    expect(reg.user.role).toBe('USER');

    await expect(
      authService.register({
        email: 'newuser@dtu.edu.vn',
        password: 'password123',
        fullName: 'Duplicate',
      }),
    ).rejects.toThrow(ConflictException);

    await expect(
      authService.register({
        email: 'bad-email',
        password: '123',
        fullName: '',
      }),
    ).rejects.toThrow(BadRequestException);

    const loginRes = await authService.login({
      email: 'newuser@dtu.edu.vn',
      password: 'password123',
    });
    expect(loginRes.user.id).toBe(reg.user.id);

    await expect(
      authService.login({
        email: 'newuser@dtu.edu.vn',
        password: 'wrong-password',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('supports deterministic sandbox Google login and links existing email users', async () => {
    const first = await authService.googleLogin({
      idToken: 'mock-google:google.listener@dtu.edu.vn:Nguyễn Văn B',
    });
    expect(first.user.email).toBe('google.listener@dtu.edu.vn');
    expect(first.user.fullName).toBe('Nguyễn Văn B');

    // Second login with same email/token reuses same user ID
    const second = await authService.googleLogin({
      idToken: 'mock-google:google.listener@dtu.edu.vn:Nguyễn Văn B',
    });
    expect(second.user.id).toBe(first.user.id);

    // Link Google login to an existing password user by email
    const passwordUser = await authService.register({
      email: 'linkme@dtu.edu.vn',
      password: 'secret-password',
      fullName: 'Link Account',
    });
    const linked = await authService.googleLogin({
      idToken: 'mock-google:linkme@dtu.edu.vn:Link Account',
    });
    expect(linked.user.id).toBe(passwordUser.user.id);
  });

  it('verifies real Google ID token via Google tokeninfo API', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        sub: 'google-sub-999',
        email: 'real.google@gmail.com',
        email_verified: 'true',
        name: 'Real Listener',
        picture: 'https://example.com/avatar.png',
      }),
    } as Response);

    const result = await authService.googleLogin({ idToken: 'real-google-id-token' });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(result.user.email).toBe('real.google@gmail.com');
    expect(result.user.avatarUrl).toBe('https://example.com/avatar.png');
  });

  it('rejects tampered or expired JWT tokens', () => {
    const token = jwtService.sign({
      id: 'user-1',
      email: 'user1@dtu.edu.vn',
      fullName: 'User One',
      role: 'USER',
      planTier: 'FREE',
      vipExpiresAt: null,
      avatarUrl: null,
    });

    const claims = jwtService.verify(token);
    expect(claims.sub).toBe('user-1');
    expect(claims.planTier).toBe('FREE');

    const parts = token.split('.');
    const tampered = `${parts[0]}.${parts[1]}.invalid_signature`;
    expect(() => jwtService.verify(tampered)).toThrow(UnauthorizedException);

    const expiredToken = jwtService.sign(
      {
        id: 'user-1',
        email: 'user1@dtu.edu.vn',
        fullName: 'User One',
        role: 'USER',
        planTier: 'FREE',
        vipExpiresAt: null,
        avatarUrl: null,
      },
      -30,
    );
    expect(() => jwtService.verify(expiredToken)).toThrow(UnauthorizedException);
  });

  it('reflects VIP upgrade immediately in JwtAuthGuard & UsersService and enforces RolesGuard', async () => {
    const { accessToken, user } = await authService.register({
      email: 'vip-check@dtu.edu.vn',
      password: 'password123',
      fullName: 'VIP Listener',
    });

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await database.upgradeUserToVip(user.id, expiresAt);

    // Non-public route with OLD token fetches latest VIP state from DatabaseService
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(false);
    const req: { headers?: Record<string, string>; user?: unknown } = {
      headers: { authorization: `Bearer ${accessToken}` },
    };
    await expect(jwtAuthGuard.canActivate(createHttpExecutionContext(req))).resolves.toBe(true);

    expect(req.user).toMatchObject({
      id: user.id,
      planTier: 'VIP',
      vipExpiresAt: expiresAt.toISOString(),
    });

    const meRes = await authController.getMe(req.user as typeof user);
    expect(meRes.success).toBe(true);
    expect(meRes.data.planTier).toBe('VIP');

    const usersMe = await usersService.getMe(user.id);
    expect(usersMe.planTier).toBe('VIP');

    // Public route opportunistically decodes valid Bearer token
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(true);
    const publicValidReq: { headers?: Record<string, string>; user?: unknown } = {
      headers: { authorization: `Bearer ${accessToken}` },
    };
    await expect(
      jwtAuthGuard.canActivate(createHttpExecutionContext(publicValidReq)),
    ).resolves.toBe(true);
    expect(publicValidReq.user).toMatchObject({ id: user.id, planTier: 'VIP' });

    // Public route ignores invalid token without failing
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(true);
    const publicReq: { headers?: Record<string, string>; user?: unknown } = {
      headers: { authorization: 'Bearer invalid.token.here' },
    };
    await expect(jwtAuthGuard.canActivate(createHttpExecutionContext(publicReq))).resolves.toBe(
      true,
    );
    expect(publicReq.user).toBeUndefined();

    // Non-public route without token throws UnauthorizedException
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(false);
    await expect(jwtAuthGuard.canActivate(createHttpExecutionContext({}))).rejects.toThrow(
      UnauthorizedException,
    );

    // RolesGuard rejects USER when ADMIN required, allows ADMIN
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(['ADMIN']);
    expect(() => rolesGuard.canActivate(createHttpExecutionContext({ user: req.user }))).toThrow(
      ForbiddenException,
    );

    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(['ADMIN']);
    expect(
      rolesGuard.canActivate(createHttpExecutionContext({ user: { ...user, role: 'ADMIN' } })),
    ).toBe(true);
  });
});
