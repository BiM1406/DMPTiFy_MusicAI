import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEMO_USER_ID,
  type PaymentTransactionRecord,
  type UserRecord,
} from '../../common/types/domain.types.js';
import { AppConfigModule, AppConfigService } from '../../config/env.config.js';
import { DatabaseModule } from '../../database/database.module.js';
import { DatabaseService } from '../../database/database.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { BillingController } from './billing.controller.js';
import { BillingModule } from './billing.module.js';
import { BillingService } from './billing.service.js';
import { VnpaySigner } from './vnpay.signer.js';

describe('BillingService', () => {
  const secret = 'UNIT_TEST_VNPAY_SECRET';

  const createTestingModule = async () => {
    const transactions = new Map<string, PaymentTransactionRecord>();
    const demoUser: UserRecord = {
      id: DEMO_USER_ID,
      email: 'dat.nguyen@dtu.edu.vn',
      passwordHash: null,
      fullName: 'Nguyễn Tuấn Đạt',
      avatarUrl: null,
      googleId: null,
      role: 'USER',
      planTier: 'FREE',
      vipExpiresAt: null,
      createdAt: new Date('2026-11-01T00:00:00.000Z'),
    };

    const mockDatabase = {
      createPaymentTransaction: vi.fn().mockImplementation(async (input) => {
        const record: PaymentTransactionRecord = {
          id: `pay-${transactions.size + 1}`,
          txnRef: input.txnRef,
          userId: input.userId,
          amountVnd: input.amountVnd,
          status: 'PENDING',
          vnpTransactionNo: null,
          rawIpnPayload: null,
          paidAt: null,
          createdAt: new Date(),
        };
        transactions.set(record.txnRef, record);
        return record;
      }),
      findPaymentByTxnRef: vi.fn().mockImplementation(async (txnRef: string) => {
        return transactions.get(txnRef) ?? null;
      }),
      confirmPaymentAndUpgradeVip: vi.fn().mockImplementation(async (input) => {
        const txn = transactions.get(input.txnRef);
        if (!txn) {
          return { outcome: 'NOT_FOUND' as const };
        }
        if (txn.status !== 'PENDING') {
          return { outcome: 'ALREADY_CONFIRMED' as const, transaction: txn };
        }

        txn.status = input.paidStatus;
        txn.vnpTransactionNo = input.vnpTransactionNo;
        txn.rawIpnPayload = input.rawIpnPayload;
        txn.paidAt = input.paidStatus === 'PAID' ? new Date() : null;

        if (input.paidStatus === 'PAID') {
          demoUser.planTier = 'VIP';
          demoUser.vipExpiresAt = new Date(Date.now() + (input.vipDays ?? 30) * 86400 * 1000);
          return { outcome: 'UPDATED_PAID' as const, transaction: txn, user: { ...demoUser } };
        }
        return { outcome: 'UPDATED_FAILED' as const, transaction: txn };
      }),
      findUserById: vi.fn().mockResolvedValue(demoUser),
    };

    const mockConfig = {
      port: 3001,
      vnpayTmnCode: 'DMPTIFY_TEST',
      vnpayHashSecret: secret,
      vnpayUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
      vnpayReturnUrl: 'http://localhost:3001/api/v1/payments/vnpay/return',
      resendApiKey: '',
      resendFromEmail: 'DMPTiFy <no-reply@dmptify.local>',
    } as AppConfigService;

    const moduleRef = await Test.createTestingModule({
      controllers: [BillingController],
      providers: [
        VnpaySigner,
        NotificationsService,
        BillingService,
        { provide: DatabaseService, useValue: mockDatabase },
        { provide: AppConfigService, useValue: mockConfig },
      ],
    }).compile();

    return {
      service: moduleRef.get(BillingService),
      controller: moduleRef.get(BillingController),
      signer: moduleRef.get(VnpaySigner),
      notifications: moduleRef.get(NotificationsService),
      mockDatabase,
      transactions,
    };
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('creates signed VNPay payment URL with default 49000 VND and validates positive amount', async () => {
    const { service, controller, signer } = await createTestingModule();

    await expect(service.createPaymentUrl({ amountVnd: 0 })).rejects.toThrow(BadRequestException);
    await expect(service.createPaymentUrl({ amountVnd: -5000 })).rejects.toThrow(BadRequestException);

    const wrapped = await controller.createUrl();
    expect(wrapped.success).toBe(true);
    expect(wrapped.data.amountVnd).toBe(49000);
    expect(wrapped.data.provider).toBe('vnpay');

    const url = new URL(wrapped.data.paymentUrl);
    expect(url.searchParams.get('vnp_Amount')).toBe('4900000');
    expect(url.searchParams.get('vnp_TxnRef')).toBe(wrapped.data.txnRef);
    expect(
      signer.verifySignature(Object.fromEntries(url.searchParams.entries()), secret),
    ).toBe(true);
  });

  it('enforces VNPay IPN codes 97, 01, 04, 02, 00 (RAW JSON) and sends VIP invoice email', async () => {
    const { service, controller, signer, notifications } = await createTestingModule();
    const created = await service.createPaymentUrl({ amountVnd: 49000 });

    const signIpn = (overrides: Record<string, string>) => {
      const signed = signer.createSignedUrl(
        'http://localhost/ipn',
        {
          vnp_TxnRef: created.txnRef,
          vnp_Amount: '4900000',
          vnp_ResponseCode: '00',
          vnp_TransactionNo: '14123456',
          ...overrides,
        },
        secret,
      );
      return Object.fromEntries(new URL(signed).searchParams.entries());
    };

    // 97: Invalid Checksum
    const badHash = await controller.handleIpn({
      vnp_TxnRef: created.txnRef,
      vnp_Amount: '4900000',
      vnp_ResponseCode: '00',
      vnp_SecureHash: '0'.repeat(128),
    });
    expect(badHash).toEqual({ RspCode: '97', Message: 'Invalid Checksum' });
    expect('success' in badHash).toBe(false);

    // 01: Order not Found
    const notFound = await controller.handleIpn(signIpn({ vnp_TxnRef: 'UNKNOWN_TXN' }));
    expect(notFound).toEqual({ RspCode: '01', Message: 'Order not Found' });

    // 04: Invalid Amount
    const wrongAmount = await controller.handleIpn(signIpn({ vnp_Amount: '100000' }));
    expect(wrongAmount).toEqual({ RspCode: '04', Message: 'Invalid Amount' });

    // 00: Valid payment -> VIP upgrade + invoice email
    const valid = await controller.handleIpn(signIpn({}));
    expect(valid).toEqual({ RspCode: '00', Message: 'Confirm Success' });
    expect('success' in valid).toBe(false);
    expect(notifications.getSentEmails()).toHaveLength(1);
    expect(notifications.getSentEmails()[0].template).toBe('vip-invoice');

    // 02: Order already confirmed on replay
    const replay = await controller.handleIpn(signIpn({}));
    expect(replay).toEqual({ RspCode: '02', Message: 'Order already confirmed' });

    // Return URL check
    const ret = controller.handleReturn(signIpn({}));
    expect(ret).toEqual({
      success: true,
      data: { verified: true, code: '00', txnRef: created.txnRef },
    });
  });

  it('marks transaction FAILED when vnp_ResponseCode is non-00 without sending VIP invoice email', async () => {
    const { service, signer, notifications, mockDatabase } = await createTestingModule();
    const created = await service.createPaymentUrl({ amountVnd: 49000 });

    const signed = signer.createSignedUrl(
      'http://localhost/ipn',
      {
        vnp_TxnRef: created.txnRef,
        vnp_Amount: '4900000',
        vnp_ResponseCode: '24',
        vnp_TransactionNo: '0',
      },
      secret,
    );
    const query = Object.fromEntries(new URL(signed).searchParams.entries());

    const res = await service.handleIpn(query);
    expect(res).toEqual({ RspCode: '00', Message: 'Confirm Success' });
    expect(mockDatabase.confirmPaymentAndUpgradeVip).toHaveBeenCalledWith(
      expect.objectContaining({
        txnRef: created.txnRef,
        paidStatus: 'FAILED',
      }),
    );
    expect(notifications.getSentEmails()).toHaveLength(0);
  });

  it('wires BillingModule + NotificationsModule + DatabaseModule via NestJS DI and upgrades VIP in-memory', async () => {
    const prevDbMode = process.env.DB_MODE;
    process.env.DB_MODE = 'memory';
    const moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, DatabaseModule, BillingModule],
    }).compile();

    try {
      const db = moduleRef.get(DatabaseService);
      await db.resetForTesting();
      const controller = moduleRef.get(BillingController);
      const signer = moduleRef.get(VnpaySigner);
      const config = moduleRef.get(AppConfigService);
      const notifications = moduleRef.get(NotificationsService);

      const created = await controller.createUrl({ amountVnd: 49000 });
      expect(created.success).toBe(true);
      expect(created.data.txnRef).toBeTruthy();

      const signed = signer.createSignedUrl(
        'http://localhost/ipn',
        {
          vnp_TxnRef: created.data.txnRef,
          vnp_Amount: '4900000',
          vnp_ResponseCode: '00',
          vnp_TransactionNo: '998877',
        },
        config.vnpayHashSecret,
      );
      const query = Object.fromEntries(new URL(signed).searchParams.entries());
      const ipnRes = await controller.handleIpn(query);
      expect(ipnRes).toEqual({ RspCode: '00', Message: 'Confirm Success' });

      const upgraded = await db.findUserById(DEMO_USER_ID);
      expect(upgraded?.planTier).toBe('VIP');
      expect(upgraded?.vipExpiresAt).not.toBeNull();
      expect(notifications.getSentEmails()).toHaveLength(1);
    } finally {
      await moduleRef.close();
      if (prevDbMode === undefined) {
        delete process.env.DB_MODE;
      } else {
        process.env.DB_MODE = prevDbMode;
      }
    }
  });
});
