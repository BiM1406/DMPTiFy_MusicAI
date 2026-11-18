import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../common/types/domain.types.js';
import { DatabaseService } from '../../database/database.service.js';
import { toAuthenticatedUser } from '../auth/auth.mapper.js';

@Injectable()
export class UsersService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async getMe(userId: string): Promise<AuthenticatedUser> {
    const userRecord = await this.database.findUserById(userId);
    if (!userRecord) {
      throw new NotFoundException('User not found');
    }
    return toAuthenticatedUser(userRecord);
  }
}
