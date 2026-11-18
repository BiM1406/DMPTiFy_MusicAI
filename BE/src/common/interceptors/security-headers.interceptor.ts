import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import type { Observable } from 'rxjs';

interface HeaderWritableResponse {
  setHeader?: (name: string, value: string) => void;
}

@Injectable()
export class SecurityHeadersInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() === 'http') {
      const response = context
        .switchToHttp()
        .getResponse<HeaderWritableResponse | undefined>();

      if (response && typeof response.setHeader === 'function') {
        response.setHeader('X-Content-Type-Options', 'nosniff');
        response.setHeader('X-Frame-Options', 'DENY');
        response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        response.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
        response.setHeader(
          'Permissions-Policy',
          'camera=(), microphone=(), geolocation=()',
        );
      }
    }

    return next.handle();
  }
}
