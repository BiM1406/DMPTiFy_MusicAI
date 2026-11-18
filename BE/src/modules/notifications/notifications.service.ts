import crypto from 'node:crypto';
import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../config/env.config.js';

export type NotificationTemplate = 'vip-invoice' | 'weekly-mood-recap';

export interface SentEmailRecord {
  id: string;
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
  provider: 'resend' | 'sandbox';
  template: NotificationTemplate;
  sentAt: string;
  metadata?: Record<string, unknown>;
}

export interface SendVipInvoiceEmailParams {
  toEmail: string;
  fullName: string;
  txnRef: string;
  amountVnd: number;
  vipExpiresAt: Date;
}

export interface SendWeeklyMoodRecapEmailParams {
  toEmail: string;
  fullName: string;
  topMood: string;
  totalTracks: number;
}

interface ResendApiResponse {
  id?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly sentEmails: SentEmailRecord[] = [];

  constructor(@Inject(AppConfigService) private readonly config: AppConfigService) {}

  async sendVipInvoiceEmail(params: SendVipInvoiceEmailParams): Promise<SentEmailRecord> {
    const toEmail = params.toEmail?.trim();
    if (!toEmail) {
      throw new BadRequestException('toEmail is required');
    }

    const formattedAmount = `${params.amountVnd.toLocaleString('vi-VN')} VND`;
    const expiresIso = params.vipExpiresAt.toISOString();
    const subject = `[DMPTiFy] Hóa đơn nâng cấp VIP thành công - ${params.txnRef}`;
    const safeName = escapeHtml(params.fullName);
    const safeTxnRef = escapeHtml(params.txnRef);

    const text = [
      `Xin chào ${params.fullName},`,
      `Cảm ơn bạn đã nâng cấp tài khoản DMPTiFy VIP.`,
      `Mã giao dịch: ${params.txnRef}`,
      `Số tiền thanh toán: ${formattedAmount}`,
      `Hiệu lực VIP đến: ${expiresIso}`,
    ].join('\n');

    const html = [
      '<div style="font-family:sans-serif;line-height:1.6;color:#111827">',
      `<h2>Xin chào ${safeName},</h2>`,
      '<p>Tài khoản <strong>DMPTiFy VIP</strong> của bạn đã được kích hoạt thành công.</p>',
      '<ul>',
      `<li>Mã giao dịch: <code>${safeTxnRef}</code></li>`,
      `<li>Số tiền: <strong>${escapeHtml(formattedAmount)}</strong></li>`,
      `<li>Hiệu lực đến: <strong>${escapeHtml(expiresIso)}</strong></li>`,
      '</ul>',
      '<p>Chúc bạn có những phút giây nghe nhạc thật thư giãn cùng DMPTiFy!</p>',
      '</div>',
    ].join('');

    return this.dispatchEmail({
      to: toEmail,
      subject,
      html,
      text,
      template: 'vip-invoice',
      metadata: {
        txnRef: params.txnRef,
        amountVnd: params.amountVnd,
        vipExpiresAt: expiresIso,
      },
    });
  }

  async sendWeeklyMoodRecapEmail(
    params: SendWeeklyMoodRecapEmailParams,
  ): Promise<SentEmailRecord> {
    const toEmail = params.toEmail?.trim();
    if (!toEmail) {
      throw new BadRequestException('toEmail is required');
    }

    const subject = `[DMPTiFy] Tổng kết cảm xúc âm nhạc tuần của ${params.fullName}`;
    const safeName = escapeHtml(params.fullName);
    const safeMood = escapeHtml(params.topMood);

    const text = [
      `Xin chào ${params.fullName},`,
      `Trong tuần qua bạn đã nghe tổng cộng ${params.totalTracks} lượt phát trên DMPTiFy.`,
      `Tâm trạng nổi bật nhất của bạn: ${params.topMood}.`,
    ].join('\n');

    const html = [
      '<div style="font-family:sans-serif;line-height:1.6;color:#111827">',
      `<h2>Tổng kết tuần của ${safeName}</h2>`,
      `<p>Tổng số bản nhạc đã thưởng thức: <strong>${params.totalTracks}</strong></p>`,
      `<p>Tâm trạng chủ đạo: <strong>${safeMood}</strong></p>`,
      '<p>Mở DMPTiFy để khám phá thêm những giai điệu chữa lành dành riêng cho bạn.</p>',
      '</div>',
    ].join('');

    return this.dispatchEmail({
      to: toEmail,
      subject,
      html,
      text,
      template: 'weekly-mood-recap',
      metadata: {
        topMood: params.topMood,
        totalTracks: params.totalTracks,
      },
    });
  }

  getSentEmails(): SentEmailRecord[] {
    return [...this.sentEmails];
  }

  clearSentEmails(): void {
    this.sentEmails.length = 0;
  }

  private async dispatchEmail(payload: {
    to: string;
    subject: string;
    html: string;
    text: string;
    template: NotificationTemplate;
    metadata: Record<string, unknown>;
  }): Promise<SentEmailRecord> {
    const apiKey = this.config.resendApiKey?.trim() ?? '';
    const from = this.config.resendFromEmail?.trim() || 'DMPTiFy <onboarding@resend.dev>';
    const sentAt = new Date().toISOString();

    if (apiKey) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from,
            to: [payload.to],
            subject: payload.subject,
            html: payload.html,
            text: payload.text,
          }),
          signal: AbortSignal.timeout(8000),
        });

        if (response.ok) {
          const data = (await response.json()) as ResendApiResponse;
          const record: SentEmailRecord = {
            id: data.id ?? `resend-${crypto.randomUUID()}`,
            to: payload.to,
            from,
            subject: payload.subject,
            html: payload.html,
            text: payload.text,
            provider: 'resend',
            template: payload.template,
            sentAt,
            metadata: payload.metadata,
          };
          this.sentEmails.push(record);
          return record;
        }

        this.logger.warn(`Resend API responded with HTTP ${response.status}; recording in sandbox outbox.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(`Resend API call failed (${message}); recording in sandbox outbox.`);
      }
    }

    const sandboxRecord: SentEmailRecord = {
      id: `sandbox-${crypto.randomUUID()}`,
      to: payload.to,
      from,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      provider: 'sandbox',
      template: payload.template,
      sentAt,
      metadata: payload.metadata,
    };
    this.sentEmails.push(sandboxRecord);
    return sandboxRecord;
  }
}
