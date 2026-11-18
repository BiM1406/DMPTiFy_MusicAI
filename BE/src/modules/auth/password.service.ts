import { BadRequestException, Injectable } from '@nestjs/common';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const SCRYPT_KEY_LENGTH = 64;
const SALT_BYTES = 16;

@Injectable()
export class PasswordService {
  private deriveKey(plain: string, salt: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      scrypt(plain, salt, SCRYPT_KEY_LENGTH, (err, derivedKey) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(derivedKey);
      });
    });
  }

  async hash(plain: string): Promise<string> {
    if (typeof plain !== 'string' || plain.length === 0) {
      throw new BadRequestException('Password must not be empty');
    }
    const salt = randomBytes(SALT_BYTES).toString('hex');
    const derivedKey = await this.deriveKey(plain, salt);
    return `${salt}:${derivedKey.toString('hex')}`;
  }

  async verify(plain: string, stored: string): Promise<boolean> {
    if (typeof plain !== 'string' || typeof stored !== 'string' || !stored.includes(':')) {
      return false;
    }

    const parts = stored.split(':');
    if (parts.length !== 2) {
      return false;
    }

    const [salt, expectedHex] = parts;
    if (
      !salt ||
      !expectedHex ||
      expectedHex.length % 2 !== 0 ||
      !/^[0-9a-f]+$/i.test(expectedHex)
    ) {
      return false;
    }

    const expectedBuf = Buffer.from(expectedHex, 'hex');
    const actualBuf = await this.deriveKey(plain, salt);
    if (actualBuf.length !== expectedBuf.length) {
      return false;
    }

    return timingSafeEqual(actualBuf, expectedBuf);
  }
}
