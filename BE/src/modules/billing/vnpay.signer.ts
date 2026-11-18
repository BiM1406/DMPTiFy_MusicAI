import crypto from 'node:crypto';
import { Injectable } from '@nestjs/common';

export type VnpayParams = Record<string, unknown>;

function normalizeParamValue(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (Array.isArray(value)) {
    const first = value[0];
    return first === undefined || first === null ? null : String(first);
  }
  if (typeof value === 'object') {
    return null;
  }
  const str = String(value);
  return str === '' ? null : str;
}

export function encodeVnpayValue(value: string): string {
  return encodeURIComponent(value).replace(/%20/g, '+');
}

export function buildVnpayHashData(params: VnpayParams): string {
  const keys = Object.keys(params)
    .filter((key) => key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType')
    .sort();

  const pairs: string[] = [];
  for (const key of keys) {
    const normalized = normalizeParamValue(params[key]);
    if (normalized === null) {
      continue;
    }
    pairs.push(`${encodeVnpayValue(key)}=${encodeVnpayValue(normalized)}`);
  }

  return pairs.join('&');
}

export function signVnpayData(hashData: string, hashSecret: string): string {
  return crypto
    .createHmac('sha512', hashSecret)
    .update(hashData, 'utf8')
    .digest('hex')
    .toLowerCase();
}

export function createVnpaySignedUrl(
  baseUrl: string,
  params: VnpayParams,
  hashSecret: string,
): string {
  const hashData = buildVnpayHashData(params);
  const secureHash = signVnpayData(hashData, hashSecret);
  const separator = baseUrl.includes('?') ? '&' : '?';
  if (!hashData) {
    return `${baseUrl}${separator}vnp_SecureHash=${secureHash}`;
  }
  return `${baseUrl}${separator}${hashData}&vnp_SecureHash=${secureHash}`;
}

export function verifyVnpaySignature(
  queryParams: VnpayParams,
  hashSecret: string,
): boolean {
  const rawHash = normalizeParamValue(queryParams.vnp_SecureHash);
  if (!rawHash || !hashSecret || !/^[0-9a-f]+$/i.test(rawHash)) {
    return false;
  }

  const hashData = buildVnpayHashData(queryParams);
  const expectedHash = signVnpayData(hashData, hashSecret);

  const expectedBuf = Buffer.from(expectedHash, 'hex');
  const receivedBuf = Buffer.from(rawHash.toLowerCase(), 'hex');
  if (expectedBuf.length === 0 || expectedBuf.length !== receivedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

@Injectable()
export class VnpaySigner {
  static buildHashData(params: VnpayParams): string {
    return buildVnpayHashData(params);
  }

  static sign(hashData: string, hashSecret: string): string {
    return signVnpayData(hashData, hashSecret);
  }

  static createSignedUrl(
    baseUrl: string,
    params: VnpayParams,
    hashSecret: string,
  ): string {
    return createVnpaySignedUrl(baseUrl, params, hashSecret);
  }

  static verifySignature(queryParams: VnpayParams, hashSecret: string): boolean {
    return verifyVnpaySignature(queryParams, hashSecret);
  }

  buildHashData(params: VnpayParams): string {
    return buildVnpayHashData(params);
  }

  sign(hashData: string, hashSecret: string): string {
    return signVnpayData(hashData, hashSecret);
  }

  createSignedUrl(
    baseUrl: string,
    params: VnpayParams,
    hashSecret: string,
  ): string {
    return createVnpaySignedUrl(baseUrl, params, hashSecret);
  }

  verifySignature(queryParams: VnpayParams, hashSecret: string): boolean {
    return verifyVnpaySignature(queryParams, hashSecret);
  }
}
