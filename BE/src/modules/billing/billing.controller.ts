import { Body, Controller, Get, Inject, Post, Query, Req } from '@nestjs/common';
import { ok, type ApiResponse } from '../../common/api-response.js';
import { CurrentUser, Public } from '../../common/decorators/auth.decorators.js';
import { DEMO_USER_ID, type AuthenticatedUser } from '../../common/types/domain.types.js';
import {
  BillingService,
  type CreateVnpayUrlDto,
  type CreateVnpayUrlResult,
  type VnpayIpnResponse,
  type VnpayReturnResult,
} from './billing.service.js';

@Controller('v1/payments/vnpay')
export class BillingController {
  constructor(@Inject(BillingService) private readonly billingService: BillingService) {}

  @Public()
  @Post('create-url')
  async createUrl(
    @Body() body?: CreateVnpayUrlDto,
    @CurrentUser() user?: AuthenticatedUser,
    @Req() req?: { ip?: string },
  ): Promise<ApiResponse<CreateVnpayUrlResult>> {
    const result = await this.billingService.createPaymentUrl(
      body,
      user?.id ?? DEMO_USER_ID,
      req?.ip || '127.0.0.1',
    );
    return ok(result);
  }

  @Public()
  @Get('ipn')
  async handleIpn(@Query() query: Record<string, unknown>): Promise<VnpayIpnResponse> {
    return this.billingService.handleIpn(query);
  }

  @Public()
  @Get('return')
  handleReturn(@Query() query: Record<string, unknown>): ApiResponse<VnpayReturnResult> {
    return ok(this.billingService.handleReturn(query));
  }
}
