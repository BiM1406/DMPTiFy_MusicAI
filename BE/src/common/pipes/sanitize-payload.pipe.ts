import {
  Injectable,
  type ArgumentMetadata,
  type PipeTransform,
} from '@nestjs/common';

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_DEPTH = 20;

function sanitizeValue(value: unknown, depth: number): unknown {
  if (depth > MAX_DEPTH) {
    return value;
  }

  if (typeof value === 'string') {
    return value.replaceAll('\u0000', '');
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, depth + 1));
  }

  if (value !== null && typeof value === 'object') {
    const proto = Object.getPrototypeOf(value) as object | null;
    const isPlain = proto === Object.prototype || proto === null;
    if (!isPlain) {
      return value;
    }

    const sanitized: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
      if (DANGEROUS_KEYS.has(key)) {
        continue;
      }
      sanitized[key] = sanitizeValue(
        (value as Record<string, unknown>)[key],
        depth + 1,
      );
    }
    return sanitized;
  }

  return value;
}

@Injectable()
export class SanitizePayloadPipe implements PipeTransform {
  transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    return sanitizeValue(value, 0);
  }
}
