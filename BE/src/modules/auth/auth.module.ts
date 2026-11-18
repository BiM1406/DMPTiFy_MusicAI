import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { GoogleOAuthService } from './google-oauth.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { JwtTokenService } from './jwt.service.js';
import { PasswordService } from './password.service.js';

@Module({
  controllers: [AuthController],
  providers: [
    PasswordService,
    JwtTokenService,
    GoogleOAuthService,
    AuthService,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [
    AuthService,
    JwtTokenService,
    JwtAuthGuard,
    RolesGuard,
    PasswordService,
  ],
})
export class AuthModule {}
