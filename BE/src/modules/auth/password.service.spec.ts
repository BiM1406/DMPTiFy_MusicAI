import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { PasswordService } from './password.service.js';

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [PasswordService],
    }).compile();

    service = moduleRef.get(PasswordService);
  });

  it('hashes password with unique random salt and verifies matching password', async () => {
    const hashA = await service.hash('dmptify-secret-2026');
    const hashB = await service.hash('dmptify-secret-2026');

    expect(hashA).toContain(':');
    expect(hashA).not.toBe(hashB);
    await expect(service.verify('dmptify-secret-2026', hashA)).resolves.toBe(true);
    await expect(service.verify('dmptify-secret-2026', hashB)).resolves.toBe(true);
  });

  it('returns false for wrong password or malformed stored hash', async () => {
    const hash = await service.hash('correct-password');

    await expect(service.verify('wrong-password', hash)).resolves.toBe(false);
    await expect(service.verify('correct-password', 'not-a-valid-hash')).resolves.toBe(false);
    await expect(service.verify('correct-password', 'salt:zz-non-hex')).resolves.toBe(false);
  });

  it('throws BadRequestException when hashing empty password', async () => {
    await expect(service.hash('')).rejects.toThrow(BadRequestException);
  });
});
