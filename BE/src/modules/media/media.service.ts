import crypto from 'node:crypto';
import path from 'node:path';
import {
  BadGatewayException,
  BadRequestException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { AppConfigService } from '../../config/env.config.js';

export type MediaResourceType = 'video' | 'image' | 'raw';

export interface UploadMediaDto {
  fileName: string;
  resourceType?: MediaResourceType;
  folder?: string;
  dataBase64?: string;
}

export interface UploadMediaResult {
  publicId: string;
  url: string;
  resourceType: MediaResourceType;
  provider: 'cloudinary' | 'sandbox';
}

interface CloudinaryUploadResponse {
  public_id?: string;
  secure_url?: string;
  url?: string;
  resource_type?: MediaResourceType;
  error?: { message?: string };
}

const VALID_RESOURCE_TYPES: ReadonlySet<MediaResourceType> = new Set([
  'video',
  'image',
  'raw',
]);

function inferResourceType(fileName: string): MediaResourceType {
  const ext = path.extname(fileName).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif'].includes(ext)) {
    return 'image';
  }
  if (['.lrc', '.txt', '.json', '.srt'].includes(ext)) {
    return 'raw';
  }
  return 'video';
}

function sanitizeSlug(rawName: string): string {
  const parsed = path.parse(rawName.trim());
  const base = (parsed.name || rawName.trim())
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'media-file';
}

function normalizeFolder(folder?: string): string {
  const cleaned = (folder ?? 'dmptify/uploads')
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .replace(/[^a-zA-Z0-9/_-]+/g, '-');
  return cleaned || 'dmptify/uploads';
}

@Injectable()
export class MediaService {
  constructor(@Inject(AppConfigService) private readonly config: AppConfigService) {}

  generateSignature(
    params: Record<string, string | number | undefined>,
    apiSecret: string,
  ): string {
    const serialized = Object.keys(params)
      .filter((key) => params[key] !== undefined && String(params[key]) !== '')
      .sort()
      .map((key) => `${key}=${String(params[key])}`)
      .join('&');

    return crypto
      .createHash('sha1')
      .update(`${serialized}${apiSecret}`, 'utf8')
      .digest('hex');
  }

  async upload(dto: UploadMediaDto): Promise<UploadMediaResult> {
    if (!dto || typeof dto.fileName !== 'string' || !dto.fileName.trim()) {
      throw new BadRequestException('fileName is required and must be non-empty');
    }

    const rawFileName = dto.fileName.trim();
    if (dto.resourceType !== undefined && !VALID_RESOURCE_TYPES.has(dto.resourceType)) {
      throw new BadRequestException('resourceType must be video, image, or raw');
    }

    const resourceType = dto.resourceType ?? inferResourceType(rawFileName);
    const folder = normalizeFolder(dto.folder);
    const baseSlug = sanitizeSlug(rawFileName);
    const publicId = `${folder}/${baseSlug}`;

    const cloudName = this.config.cloudinaryCloudName?.trim() ?? '';
    const apiKey = this.config.cloudinaryApiKey?.trim() ?? '';
    const apiSecret = this.config.cloudinaryApiSecret?.trim() ?? '';

    if (!cloudName || !apiKey || !apiSecret) {
      const ext = path.extname(rawFileName).toLowerCase();
      return {
        publicId,
        url: `https://res.cloudinary.com/${cloudName || 'dmptify-sandbox'}/${resourceType}/upload/${publicId}${ext}`,
        resourceType,
        provider: 'sandbox',
      };
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = this.generateSignature(
      {
        folder,
        public_id: baseSlug,
        timestamp,
      },
      apiSecret,
    );

    const dataUri = this.formatDataUri(dto.dataBase64, resourceType);
    const formData = new FormData();
    formData.append('file', dataUri);
    formData.append('api_key', apiKey);
    formData.append('timestamp', String(timestamp));
    formData.append('folder', folder);
    formData.append('public_id', baseSlug);
    formData.append('signature', signature);

    const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/${resourceType}/upload`;
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(15000),
    });

    const payload = (await response.json()) as CloudinaryUploadResponse;
    if (!response.ok) {
      const reason = payload.error?.message || `HTTP ${response.status}`;
      throw new BadGatewayException(`Cloudinary upload failed: ${reason}`);
    }

    return {
      publicId: payload.public_id || publicId,
      url:
        payload.secure_url ||
        payload.url ||
        `https://res.cloudinary.com/${cloudName}/${resourceType}/upload/${publicId}`,
      resourceType: payload.resource_type || resourceType,
      provider: 'cloudinary',
    };
  }

  private formatDataUri(dataBase64: string | undefined, resourceType: MediaResourceType): string {
    const trimmed = dataBase64?.trim() ?? '';
    if (!trimmed) {
      return 'data:application/octet-stream;base64,';
    }
    if (trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    const mime =
      resourceType === 'image'
        ? 'image/png'
        : resourceType === 'video'
          ? 'audio/mpeg'
          : 'text/plain';
    return `data:${mime};base64,${trimmed}`;
  }
}
