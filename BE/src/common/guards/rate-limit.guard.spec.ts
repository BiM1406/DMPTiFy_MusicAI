import 'reflect-metadata';
import { HttpException, HttpStatus, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { RateLimitGuard } from './rate-limit.guard.js';

function createMockContext(options: {
  ip?: string;
  method?: string;
  path?: string;
  headers?: Record<string, string>;
}): {
  context: ExecutionContext;
  headersSent: Record<string, string>;
} {
  const headersSent: Record<string, string> = {};
  const request = {
    ip: options.ip ?? '10.0.0.1',
    method: options.method ?? 'POST',
    route: { path: options.path ?? '/api/v1/auth/login' },
    url: options.path ?? '/api/v1/auth/login',
    headers: options.headers ?? {},
  };
  const response = {
    setHeader(name: string, value: string | number) {
      headersSent[name.toLowerCase()] = String(value);
    },
  };
  const context = {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;

  return { context, headersSent };
}

describe('RateLimitGuard', () => {
  it('allows requests under limit and sets rate-limit headers', () => {
    const reflector = {
      getAllAndOverride: () => ({ limit: 3, windowMs: 60_000 }),
    } as unknown as Reflector;
    const guard = new RateLimitGuard(reflector);

    const first = createMockContext({ ip: '192.168.1.10' });
    expect(guard.canActivate(first.context)).toBe(true);
    expect(first.headersSent['x-ratelimit-limit']).toBe('3');
    expect(first.headersSent['x-ratelimit-remaining']).toBe('2');

    const second = createMockContext({ ip: '192.168.1.10' });
    expect(guard.canActivate(second.context)).toBe(true);
    expect(second.headersSent['x-ratelimit-remaining']).toBe('1');
  });

  it('throws 429 TooManyRequests with Retry-After once bucket limit is exceeded', () => {
    const reflector = {
      getAllAndOverride: () => ({ limit: 2, windowMs: 30_000 }),
    } as unknown as Reflector;
    const guard = new RateLimitGuard(reflector);

    guard.canActivate(createMockContext({ ip: '192.168.1.20' }).context);
    guard.canActivate(createMockContext({ ip: '192.168.1.20' }).context);

    const blocked = createMockContext({ ip: '192.168.1.20' });
    let caught: unknown;
    try {
      guard.canActivate(blocked.context);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(HttpException);
    const httpErr = caught as HttpException;
    expect(httpErr.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(httpErr.getResponse()).toMatchObject({
      statusCode: 429,
      code: 'RATE_LIMIT_EXCEEDED',
    });
    expect(blocked.headersSent['x-ratelimit-remaining']).toBe('0');
    expect(Number(blocked.headersSent['retry-after'])).toBeGreaterThanOrEqual(1);
  });

  it('isolates rate-limit buckets per client IP and route', () => {
    const reflector = {
      getAllAndOverride: () => ({ limit: 1, windowMs: 60_000 }),
    } as unknown as Reflector;
    const guard = new RateLimitGuard(reflector);

    expect(
      guard.canActivate(createMockContext({ ip: '10.0.0.1', path: '/a' }).context),
    ).toBe(true);
    expect(
      guard.canActivate(createMockContext({ ip: '10.0.0.2', path: '/a' }).context),
    ).toBe(true);
    expect(
      guard.canActivate(createMockContext({ ip: '10.0.0.1', path: '/b' }).context),
    ).toBe(true);
  });
});
