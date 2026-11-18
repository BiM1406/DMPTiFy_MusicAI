import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { BillingController } from './billing.controller.js';
import { BillingService } from './billing.service.js';
import { VnpaySigner } from './vnpay.signer.js';

@Module({
  imports: [NotificationsModule],
  controllers: [BillingController],
  providers: [VnpaySigner, BillingService],
  exports: [BillingService, VnpaySigner],
})
export class BillingModule {}
