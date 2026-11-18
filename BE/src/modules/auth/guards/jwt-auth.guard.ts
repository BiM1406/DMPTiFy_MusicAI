import {
  Inject,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../../common/decorators/auth.decorators.js';
import type { AuthenticatedUser } from '../../../common/types/domain.types.js';
import { DatabaseService } from '../../../database/database.service.js';
import { toAuthenticatedUser } from '../auth.mapper.js';
import { JwtTokenService } from '../jwt.service.js';

interface RequestWithUser {
  headers?: {
    authorization?: string;
  };
  user?: AuthenticatedUser;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(JwtTokenService) private readonly jwtService: JwtTokenService,
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  private extractBearerToken(authHeader?: string): string | null {
    if (typeof authHeader !== 'string') {
      return null;
    }
    const match = authHeader.trim().match(/^Bearer\s+(.+)$/i);
    return match ? match[1].trim() : null;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractBearerToken(request.headers?.authorization);

    if (!token) {
      if (isPublic) {
        return true;
      }
      throw new UnauthorizedException('Authorization Bearer token is required');
    }

    try {
      const claims = this.jwtService.verify(token);
      const latestUser = await this.database.findUserById(claims.sub);
      if (!latestUser) {
        if (isPublic) {
          return true;
        }
        throw new UnauthorizedException('Authenticated user no longer exists');
      }

      request.user = toAuthenticatedUser(latestUser);
      return true;
    } catch (error) {
      if (isPublic) {
        return true;
      }
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired authentication token');
    }
  }
}
