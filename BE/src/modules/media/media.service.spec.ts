import 'reflect-metadata';
import crypto from 'node:crypto';
import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppConfigService } from '../../config/env.config.js';
import { MediaController } from './media.controller.js';
import { MediaService } from './media.service.js';

describe('MediaService', () => {
  const originalFetch = globalThis.fetch;

  const createTestingModule = async (overrides: Partial<AppConfigService> = {}) => {
    const mockConfig = {
      cloudinaryCloudName: '',
      cloudinaryApiKey: '',
      cloudinaryApiSecret: '',
      ...overrides,
    } as AppConfigService;

    const moduleRef = await Test.createTestingModule({
      controllers: [MediaController],
      providers: [
        MediaService,
        { provide: AppConfigService, useValue: mockConfig },
      ],
    }).compile();

    return {
      service: moduleRef.get(MediaService),
      controller: moduleRef.get(MediaController),
    };
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('throws BadRequestException when fileName is missing or blank', async () => {
    const { service } = await createTestingModule();

    await expect(service.upload({ fileName: '' })).rejects.toThrow(BadRequestException);
    await expect(service.upload({ fileName: '   ' })).rejects.toThrow(BadRequestException);
  });

  it('returns deterministic sandbox CDN URL metadata when Cloudinary keys are empty', async () => {
    const { service, controller } = await createTestingModule();

    const first = await service.upload({
      fileName: 'Chuyen Doi Ta.mp3',
      folder: 'dmptify/audio',
    });
    const second = await service.upload({
      fileName: 'Chuyen Doi Ta.mp3',
      folder: 'dmptify/audio',
    });

    expect(first).toEqual(second);
    expect(first).toEqual({
      publicId: 'dmptify/audio/chuyen-doi-ta',
      url: 'https://res.cloudinary.com/dmptify-sandbox/video/upload/dmptify/audio/chuyen-doi-ta.mp3',
      resourceType: 'video',
      provider: 'sandbox',
    });

    const wrapped = await controller.upload({ fileName: 'cover-1.png', resourceType: 'image' });
    expect(wrapped.success).toBe(true);
    expect(wrapped.data.provider).toBe('sandbox');
    expect(wrapped.data.resourceType).toBe('image');
  });

  it('computes exact Cloudinary SHA-1 signature and uploads via fetch when configured', async () => {
    const { service } = await createTestingModule({
      cloudinaryCloudName: 'dmptify-cloud',
      cloudinaryApiKey: 'key_12345',
      cloudinaryApiSecret: 'secret_abc',
    });

    const expectedSig = crypto
      .createHash('sha1')
      .update('folder=dmptify/audio&public_id=song-1&timestamp=1700000000secret_abc', 'utf8')
      .digest('hex');
    expect(
      service.generateSignature(
        { timestamp: 1700000000, folder: 'dmptify/audio', public_id: 'song-1' },
        'secret_abc',
      ),
    ).toBe(expectedSig);

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          public_id: 'dmptify/audio/song-1',
          secure_url: 'https://res.cloudinary.com/dmptify-cloud/video/upload/v1/dmptify/audio/song-1.mp3',
          resource_type: 'video',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const uploaded = await service.upload({
      fileName: 'song-1.mp3',
      resourceType: 'video',
      folder: 'dmptify/audio',
      dataBase64: 'SGVsbG8=',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.cloudinary.com/v1_1/dmptify-cloud/video/upload');
    expect(init.method).toBe('POST');
    expect(init.body).toBeInstanceOf(FormData);

    const form = init.body as FormData;
    expect(form.get('api_key')).toBe('key_12345');
    expect(form.get('folder')).toBe('dmptify/audio');
    expect(form.get('public_id')).toBe('song-1');
    expect(form.get('signature')).toMatch(/^[0-9a-f]{40}$/);

    expect(uploaded).toEqual({
      publicId: 'dmptify/audio/song-1',
      url: 'https://res.cloudinary.com/dmptify-cloud/video/upload/v1/dmptify/audio/song-1.mp3',
      resourceType: 'video',
      provider: 'cloudinary',
    });
  });
});
