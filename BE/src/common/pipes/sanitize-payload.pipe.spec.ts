import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { SanitizePayloadPipe } from './sanitize-payload.pipe.js';

describe('SanitizePayloadPipe', () => {
  const pipe = new SanitizePayloadPipe();

  it('strips prototype pollution keys recursively while preserving safe values', () => {
    const malicious = JSON.parse(
      '{"title":"Chill Vibes","__proto__":{"isAdmin":true},"nested":{"constructor":{"x":1},"prototype":"bad","safe":"ok\\u0000!"}}',
    ) as Record<string, unknown>;

    const result = pipe.transform(malicious, { type: 'body' }) as Record<
      string,
      unknown
    >;

    expect(result.title).toBe('Chill Vibes');
    expect(Object.prototype.hasOwnProperty.call(result, '__proto__')).toBe(false);
    const nested = result.nested as Record<string, unknown>;
    expect(Object.prototype.hasOwnProperty.call(nested, 'constructor')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(nested, 'prototype')).toBe(false);
    expect(nested.safe).toBe('ok!');
  });

  it('removes null bytes from arrays and top-level strings without mutating numbers or booleans', () => {
    expect(pipe.transform('hello\u0000world', { type: 'query' })).toBe('helloworld');
    expect(pipe.transform(['a\u0000b', 42, true], { type: 'body' })).toEqual([
      'ab',
      42,
      true,
    ]);
  });
});
