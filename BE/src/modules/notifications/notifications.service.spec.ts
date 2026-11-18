import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppConfigService } from '../../config/env.config.js';
import { NotificationsService } from './notifications.service.js';

describe('NotificationsService', () => {
  const originalFetch = globalThis.fetch;

  const createService = async (overrides: Partial<AppConfigService> = {}) => {
    const mockConfig = {
      resendApiKey: '',
      resendFromEmail: 'DMPTiFy <no-reply@dmptify.local>',
      ...overrides,
    } as AppConfigService;

    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: AppConfigService, useValue: mockConfig },
      ],
    }).compile();

    return moduleRef.get(NotificationsService);
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('records VIP invoice email in sandbox outbox when resendApiKey is empty', async () => {
    const service = await createService({ resendApiKey: '' });
    const expiresAt = new Date('2026-12-18T00:00:00.000Z');

    const sent = await service.sendVipInvoiceEmail({
      toEmail: 'dat.nguyen@dtu.edu.vn',
      fullName: 'Nguyễn Tuấn Đạt',
      txnRef: 'DMP123456',
      amountVnd: 49000,
      vipExpiresAt: expiresAt,
    });

    expect(sent.provider).toBe('sandbox');
    expect(sent.to).toBe('dat.nguyen@dtu.edu.vn');
    expect(sent.template).toBe('vip-invoice');
    expect(sent.subject).toContain('DMP123456');
    expect(sent.text).toContain('Nguyễn Tuấn Đạt');
    expect(sent.text).toContain('49.000');

    expect(service.getSentEmails()).toHaveLength(1);
    service.clearSentEmails();
    expect(service.getSentEmails()).toHaveLength(0);
  });

  it('sends email via Resend REST API when resendApiKey is configured', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 're_live_001' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const service = await createService({ resendApiKey: 're_test_secret_key' });
    const sent = await service.sendWeeklyMoodRecapEmail({
      toEmail: 'dat.nguyen@dtu.edu.vn',
      fullName: 'Nguyễn Tuấn Đạt',
      topMood: 'Thư giãn & Chill',
      totalTracks: 24,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer re_test_secret_key');

    const body = JSON.parse(String(init.body)) as { to: string[]; subject: string };
    expect(body.to).toEqual(['dat.nguyen@dtu.edu.vn']);
    expect(sent.provider).toBe('resend');
    expect(sent.id).toBe('re_live_001');
    expect(sent.template).toBe('weekly-mood-recap');
  });

  it('falls back cleanly to sandbox outbox if Resend API returns error status', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 }),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const service = await createService({ resendApiKey: 're_invalid_key' });
    const sent = await service.sendVipInvoiceEmail({
      toEmail: 'dat.nguyen@dtu.edu.vn',
      fullName: 'Nguyễn Tuấn Đạt',
      txnRef: 'DMP999',
      amountVnd: 49000,
      vipExpiresAt: new Date('2026-12-18T00:00:00.000Z'),
    });

    expect(sent.provider).toBe('sandbox');
    expect(service.getSentEmails()).toHaveLength(1);
  });
});
