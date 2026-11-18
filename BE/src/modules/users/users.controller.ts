import { Controller, Get, Inject, UnauthorizedException } from '@nestjs/common';
import { ok } from '../../common/api-response.js';
import { CurrentUser } from '../../common/decorators/auth.decorators.js';
import type { AuthenticatedUser } from '../../common/types/domain.types.js';
import { UsersService } from './users.service.js';

@Controller('v1/users')
export class UsersController {
  constructor(
    @Inject(UsersService) private readonly usersService: UsersService,
  ) {}

  @Get('me')
  async getMe(@CurrentUser() user?: AuthenticatedUser) {
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    const latestUser = await this.usersService.getMe(user.id);
    return ok(latestUser);
  }
}
