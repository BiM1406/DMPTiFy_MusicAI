import 'reflect-metadata';
import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { VnpaySigner } from './vnpay.signer.js';

describe('VnpaySigner', () => {
  const secret = 'TEST_VNPAY_HASH_SECRET_123';
  const baseUrl = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';

  it('sorts keys alphabetically, replaces %20 with +, computes HMAC-SHA512, and verifies timing-safely', () => {
    const signer = new VnpaySigner();
    const params = {
      vnp_TxnRef: 'DMP2026111801',
      vnp_Amount: 4900000,
      vnp_OrderInfo: 'Nang cap DMPTiFy VIP',
      vnp_TmnCode: 'DMPTIFY',
      vnp_SecureHash: 'ignored_input_hash',
      vnp_SecureHashType: 'SHA512',
      vnp_Empty: '',
    };

    const signedUrl = signer.createSignedUrl(baseUrl, params, secret);
    const parsed = new URL(signedUrl);

    const expectedHashData =
      'vnp_Amount=4900000&vnp_OrderInfo=Nang+cap+DMPTiFy+VIP&vnp_TmnCode=DMPTIFY&vnp_TxnRef=DMP2026111801';
    const expectedHash = crypto
      .createHmac('sha512', secret)
      .update(expectedHashData, 'utf8')
      .digest('hex');

    expect(signer.buildHashData(params)).toBe(expectedHashData);
    expect(parsed.searchParams.get('vnp_SecureHash')).toBe(expectedHash);
    expect(signedUrl).toContain('Nang+cap+DMPTiFy+VIP');

    const queryObject = Object.fromEntries(parsed.searchParams.entries());
    expect(signer.verifySignature(queryObject, secret)).toBe(true);
    expect(VnpaySigner.verifySignature(queryObject, secret)).toBe(true);
  });

  it('rejects tampered parameters, wrong secret, missing hash, or malformed hex', () => {
    const signer = new VnpaySigner();
    const signedUrl = signer.createSignedUrl(
      baseUrl,
      {
        vnp_Amount: 4900000,
        vnp_TxnRef: 'DMP999',
        vnp_ResponseCode: '00',
      },
      secret,
    );

    const params = Object.fromEntries(new URL(signedUrl).searchParams.entries());

    expect(signer.verifySignature({ ...params, vnp_Amount: '100' }, secret)).toBe(false);
    expect(signer.verifySignature(params, 'WRONG_SECRET')).toBe(false);
    expect(signer.verifySignature({ vnp_Amount: '4900000', vnp_TxnRef: 'DMP999' }, secret)).toBe(
      false,
    );
    expect(signer.verifySignature({ ...params, vnp_SecureHash: 'not-hex!' }, secret)).toBe(false);
    expect(signer.verifySignature({ ...params, vnp_SecureHash: 'abcd' }, secret)).toBe(false);
  });
});
