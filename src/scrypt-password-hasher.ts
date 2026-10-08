import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { PasswordHasher } from './ports.js';

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/**
 * PasswordHasher implementation using Node's native crypto.scrypt.
 * Stores hash as `<salt_hex>:<derived_key_hex>`.
 */
export class ScryptPasswordHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    const salt = randomBytes(SALT_LENGTH);
    const derivedKey = await this.deriveKey(plain, salt);
    return `${salt.toString('hex')}:${derivedKey.toString('hex')}`;
  }

  async verify(plain: string, hash: string): Promise<boolean> {
    const parts = hash.split(':');
    if (parts.length !== 2) {
      return false;
    }

    const [saltHex, keyHex] = parts;
    if (!saltHex || !keyHex) {
      return false;
    }

    const salt = Buffer.from(saltHex, 'hex');
    const expectedKey = Buffer.from(keyHex, 'hex');
    const derivedKey = await this.deriveKey(plain, salt);

    if (expectedKey.length !== derivedKey.length) {
      return false;
    }

    return timingSafeEqual(expectedKey, derivedKey);
  }

  private deriveKey(plain: string, salt: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      scrypt(plain, salt, KEY_LENGTH, (err, derivedKey) => {
        if (err) {
          reject(err);
        } else {
          resolve(derivedKey);
        }
      });
    });
  }
}
