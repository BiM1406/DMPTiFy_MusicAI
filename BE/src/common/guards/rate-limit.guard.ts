import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  RATE_LIMIT_KEY,
  type RateLimitOptions,
} from '../decorators/rate-limit.decorator.js';

interface RateBucket {
  count: number;
  resetAt: number;
}

interface HttpRequestLike {
  ip?: string;
  method?: string;
  path?: string;
  url?: string;
  route?: {
    path?: string;
  };
  headers?: Record<string, string | string[] | undefined>;
}

interface HttpResponseLike {
  setHeader?: (name: string, value: string | number) => void;
}

const DEFAULT_RATE_LIMIT: RateLimitOptions = {
  limit: 180,
  windowMs: 60_000,
};

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, RateBucket>();

  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  resetBuckets(): void {
    this.buckets.clear();
  }

  private resolveClientIp(request: HttpRequestLike): string {
    const forwarded = request.headers?.['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
      return forwarded.split(',')[0].trim();
    }
    if (Array.isArray(forwarded) && forwarded[0]?.trim()) {
      return forwarded[0].trim();
    }
    return request.ip || '127.0.0.1';
  }

  private resolveRouteKey(request: HttpRequestLike): string {
    const method = (request.method ?? 'GET').toUpperCase();
    const routePath =
      request.route?.path ??
      request.path ??
      (typeof request.url === 'string' ? request.url.split('?')[0] : '/');
    return `${method}:${routePath}`;
  }

  private pruneExpired(now: number): void {
    if (this.buckets.size <= 500) {
      return;
    }
    for (const [key, bucket] of this.buckets.entries()) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }

  canActivate(context: ExecutionContext): boolean {
    if (context.getType && context.getType() !== 'http') {
      return true;
    }

    const custom = this.reflector.getAllAndOverride<RateLimitOptions>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );
    const policy = custom ?? DEFAULT_RATE_LIMIT;

    const http = context.switchToHttp();
    const request = http.getRequest<HttpRequestLike>();
    const response = http.getResponse<HttpResponseLike | undefined>();

    const now = Date.now();
    this.pruneExpired(now);

    const bucketKey = `${this.resolveClientIp(request)}|${this.resolveRouteKey(request)}`;
    let bucket = this.buckets.get(bucketKey);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + policy.windowMs };
      this.buckets.set(bucketKey, bucket);
    }

    if (bucket.count >= policy.limit) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((bucket.resetAt - now) / 1000),
      );
      if (response && typeof response.setHeader === 'function') {
        response.setHeader('X-RateLimit-Limit', policy.limit);
        response.setHeader('X-RateLimit-Remaining', 0);
        response.setHeader('Retry-After', retryAfterSeconds);
      }

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests, please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    bucket.count += 1;
    const remaining = Math.max(0, policy.limit - bucket.count);

    if (response && typeof response.setHeader === 'function') {
      response.setHeader('X-RateLimit-Limit', policy.limit);
      response.setHeader('X-RateLimit-Remaining', remaining);
    }

    return true;
  }
}
