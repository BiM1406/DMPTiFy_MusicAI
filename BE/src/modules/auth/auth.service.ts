import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../common/types/domain.types.js';
import { DatabaseService } from '../../database/database.service.js';
import { toAuthenticatedUser } from './auth.mapper.js';
import { GoogleOAuthService } from './google-oauth.service.js';
import { JwtTokenService } from './jwt.service.js';
import { PasswordService } from './password.service.js';

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface GoogleLoginInput {
  idToken: string;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthenticatedUser;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Injectable()
export class AuthService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(PasswordService) private readonly passwordService: PasswordService,
    @Inject(JwtTokenService) private readonly jwtService: JwtTokenService,
    @Inject(GoogleOAuthService) private readonly googleOAuth: GoogleOAuthService,
  ) {}

  async register(input: RegisterInput): Promise<AuthResponse> {
    const email = typeof input?.email === 'string' ? input.email.trim().toLowerCase() : '';
    const password = typeof input?.password === 'string' ? input.password : '';
    const fullName = typeof input?.fullName === 'string' ? input.fullName.trim() : '';

    if (!EMAIL_PATTERN.test(email)) {
      throw new BadRequestException('Invalid email format');
    }
    if (password.length < 6 || password.length > 128) {
      throw new BadRequestException('Password must be between 6 and 128 characters');
    }
    if (!fullName || fullName.length > 120) {
      throw new BadRequestException('Full name must be between 1 and 120 characters');
    }

    const existing = await this.database.findUserByEmail(email);
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await this.passwordService.hash(password);
    const created = await this.database.createUser({
      email,
      passwordHash,
      fullName,
      role: 'USER',
      planTier: 'FREE',
    });

    const user = toAuthenticatedUser(created);
    const accessToken = this.jwtService.sign(user);
    return { accessToken, user };
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const email = typeof input?.email === 'string' ? input.email.trim().toLowerCase() : '';
    const password = typeof input?.password === 'string' ? input.password : '';

    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    const userRecord = await this.database.findUserByEmail(email);
    if (!userRecord || !userRecord.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await this.passwordService.verify(password, userRecord.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const user = toAuthenticatedUser(userRecord);
    const accessToken = this.jwtService.sign(user);
    return { accessToken, user };
  }

  async googleLogin(input: GoogleLoginInput): Promise<AuthResponse> {
    const idToken = typeof input?.idToken === 'string' ? input.idToken.trim() : '';
    if (!idToken) {
      throw new BadRequestException('idToken is required');
    }

    const googleProfile = await this.googleOAuth.verifyIdToken(idToken);

    let userRecord = await this.database.findUserByGoogleId(googleProfile.googleId);
    if (!userRecord) {
      const existingByEmail = await this.database.findUserByEmail(googleProfile.email);
      if (existingByEmail) {
        userRecord = await this.database.updateUserGoogleLink(
          existingByEmail.id,
          googleProfile.googleId,
          googleProfile.avatarUrl,
        );
      } else {
        userRecord = await this.database.createUser({
          email: googleProfile.email,
          fullName: googleProfile.fullName,
          avatarUrl: googleProfile.avatarUrl,
          googleId: googleProfile.googleId,
          passwordHash: null,
          role: 'USER',
          planTier: 'FREE',
        });
      }
    }

    const user = toAuthenticatedUser(userRecord);
    const accessToken = this.jwtService.sign(user);
    return { accessToken, user };
  }

  async getProfile(userId: string): Promise<AuthenticatedUser> {
    const userRecord = await this.database.findUserById(userId);
    if (!userRecord) {
      throw new NotFoundException('User not found');
    }
    return toAuthenticatedUser(userRecord);
  }
}
