import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ok } from '../../common/api-response.js';
import { CurrentUser, Public } from '../../common/decorators/auth.decorators.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import type { AuthenticatedUser } from '../../common/types/domain.types.js';
import {
  AuthService,
  type GoogleLoginInput,
  type LoginInput,
  type RegisterInput,
} from './auth.service.js';

@Controller('v1/auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  @Public()
  @RateLimit({ limit: 25, windowMs: 60_000 })
  @Post('register')
  async register(@Body() body: RegisterInput) {
    const result = await this.authService.register(body);
    return ok(result);
  }

  @Public()
  @RateLimit({ limit: 25, windowMs: 60_000 })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginInput) {
    const result = await this.authService.login(body);
    return ok(result);
  }

  @Public()
  @RateLimit({ limit: 25, windowMs: 60_000 })
  @Post('google')
  @HttpCode(HttpStatus.OK)
  async googleLogin(@Body() body: GoogleLoginInput) {
    const result = await this.authService.googleLogin(body);
    return ok(result);
  }

  @Get('me')
  async getMe(@CurrentUser() user?: AuthenticatedUser) {
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    const profile = await this.authService.getProfile(user.id);
    return ok(profile);
  }
}
