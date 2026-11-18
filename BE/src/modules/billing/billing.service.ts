import crypto from 'node:crypto';
import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { DEMO_USER_ID } from '../../common/types/domain.types.js';
import { AppConfigService } from '../../config/env.config.js';
import { DatabaseService } from '../../database/database.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { VnpaySigner } from './vnpay.signer.js';

export interface CreateVnpayUrlDto {
  amountVnd?: number;
  orderInfo?: string;
  bankCode?: string;
  locale?: 'vn' | 'en';
}

export interface CreateVnpayUrlResult {
  paymentUrl: string;
  txnRef: string;
  amountVnd: number;
  provider: 'vnpay' | 'sandbox';
}

export interface VnpayIpnResponse {
  RspCode: string;
  Message: string;
}

export interface VnpayReturnResult {
  verified: boolean;
  code: string;
  txnRef: string;
}

const DEFAULT_VIP_PRICE_VND = 49000;
const DEFAULT_VNPAY_URL = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
const DEFAULT_VNPAY_TMN_CODE = 'DMPTIFY_SANDBOX';
const DEFAULT_VNPAY_HASH_SECRET = 'DMPTIFY_SANDBOX_HASH_SECRET_DEV';

function formatVnpayDate(date: Date): string {
  const vnTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const yyyy = vnTime.getUTCFullYear();
  const mm = String(vnTime.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(vnTime.getUTCDate()).padStart(2, '0');
  const hh = String(vnTime.getUTCHours()).padStart(2, '0');
  const mi = String(vnTime.getUTCMinutes()).padStart(2, '0');
  const ss = String(vnTime.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}${hh}${mi}${ss}`;
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(AppConfigService) private readonly config: AppConfigService,
    @Inject(VnpaySigner) private readonly vnpaySigner: VnpaySigner,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  async createPaymentUrl(
    dto: CreateVnpayUrlDto = {},
    userId: string = DEMO_USER_ID,
    clientIp = '127.0.0.1',
  ): Promise<CreateVnpayUrlResult> {
    const rawAmount = dto?.amountVnd ?? DEFAULT_VIP_PRICE_VND;
    if (typeof rawAmount !== 'number' || !Number.isFinite(rawAmount) || rawAmount <= 0) {
      throw new BadRequestException('amountVnd must be a positive number');
    }
    const amountVnd = Math.round(rawAmount);
    if (amountVnd <= 0) {
      throw new BadRequestException('amountVnd must be greater than 0');
    }

    const txnRef = `DMP${Date.now()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    await this.database.createPaymentTransaction({
      txnRef,
      userId,
      amountVnd,
    });

    const configuredTmn = this.config.vnpayTmnCode?.trim() ?? '';
    const configuredSecret = this.config.vnpayHashSecret?.trim() ?? '';
    const isDefaultSandbox =
      !configuredTmn ||
      !configuredSecret ||
      (configuredTmn === 'DMPTIFY1' &&
        configuredSecret === 'DMPTIFY_SANDBOX_HASH_SECRET_2026');
    const provider: 'vnpay' | 'sandbox' = isDefaultSandbox ? 'sandbox' : 'vnpay';

    const tmnCode = configuredTmn || DEFAULT_VNPAY_TMN_CODE;
    const hashSecret = configuredSecret || DEFAULT_VNPAY_HASH_SECRET;
    const baseUrl = this.config.vnpayUrl?.trim() || DEFAULT_VNPAY_URL;
    const returnUrl =
      this.config.vnpayReturnUrl?.trim() ||
      `http://localhost:${this.config.port || 3001}/api/v1/payments/vnpay/return`;

    const params: Record<string, string | number> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Amount: amountVnd * 100,
      vnp_CurrCode: 'VND',
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: dto?.orderInfo?.trim() || `Nang cap DMPTiFy VIP 30 ngay - ${txnRef}`,
      vnp_OrderType: 'other',
      vnp_Locale: dto?.locale === 'en' ? 'en' : 'vn',
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: clientIp || '127.0.0.1',
      vnp_CreateDate: formatVnpayDate(new Date()),
    };

    if (dto?.bankCode?.trim()) {
      params.vnp_BankCode = dto.bankCode.trim();
    }

    const paymentUrl = this.vnpaySigner.createSignedUrl(baseUrl, params, hashSecret);

    return {
      paymentUrl,
      txnRef,
      amountVnd,
      provider,
    };
  }

  async handleIpn(query: Record<string, unknown>): Promise<VnpayIpnResponse> {
    const hashSecret = this.getHashSecret();
    if (!this.vnpaySigner.verifySignature(query, hashSecret)) {
      return { RspCode: '97', Message: 'Invalid Checksum' };
    }

    const txnRef = typeof query.vnp_TxnRef === 'string' ? query.vnp_TxnRef.trim() : '';
    if (!txnRef) {
      return { RspCode: '01', Message: 'Order not Found' };
    }

    const txn = await this.database.findPaymentByTxnRef(txnRef);
    if (!txn) {
      return { RspCode: '01', Message: 'Order not Found' };
    }

    const vnpAmount = Number(query.vnp_Amount);
    if (!Number.isFinite(vnpAmount) || vnpAmount !== txn.amountVnd * 100) {
      return { RspCode: '04', Message: 'Invalid Amount' };
    }

    if (txn.status !== 'PENDING') {
      return { RspCode: '02', Message: 'Order already confirmed' };
    }

    const responseCode = typeof query.vnp_ResponseCode === 'string' ? query.vnp_ResponseCode : '';
    const isSuccess = responseCode === '00';
    const paidStatus = isSuccess ? 'PAID' : 'FAILED';
    const vnpTransactionNo =
      typeof query.vnp_TransactionNo === 'string' ? query.vnp_TransactionNo : '';

    const result = await this.database.confirmPaymentAndUpgradeVip({
      txnRef,
      vnpTransactionNo,
      rawIpnPayload: { ...query },
      paidStatus,
      vipDays: isSuccess ? 30 : undefined,
    });

    if (result.outcome === 'NOT_FOUND') {
      return { RspCode: '01', Message: 'Order not Found' };
    }

    if (result.outcome === 'ALREADY_CONFIRMED') {
      return { RspCode: '02', Message: 'Order already confirmed' };
    }

    if (result.outcome === 'UPDATED_PAID') {
      const upgradedUser = result.user ?? (await this.database.findUserById(txn.userId));
      if (upgradedUser?.email) {
        try {
          await this.notifications.sendVipInvoiceEmail({
            toEmail: upgradedUser.email,
            fullName: upgradedUser.fullName,
            txnRef: txn.txnRef,
            amountVnd: txn.amountVnd,
            vipExpiresAt:
              upgradedUser.vipExpiresAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          });
        } catch (error) {
          const reason = error instanceof Error ? error.message : 'Unknown error';
          this.logger.warn(`Failed to send VIP invoice email for ${txn.txnRef}: ${reason}`);
        }
      }
    }

    return { RspCode: '00', Message: 'Confirm Success' };
  }

  handleReturn(query: Record<string, unknown>): VnpayReturnResult {
    const verified = this.vnpaySigner.verifySignature(query, this.getHashSecret());
    const code = typeof query.vnp_ResponseCode === 'string' ? query.vnp_ResponseCode : '';
    const txnRef = typeof query.vnp_TxnRef === 'string' ? query.vnp_TxnRef : '';
    return {
      verified,
      code,
      txnRef,
    };
  }

  private getHashSecret(): string {
    return this.config.vnpayHashSecret?.trim() || DEFAULT_VNPAY_HASH_SECRET;
  }
}
