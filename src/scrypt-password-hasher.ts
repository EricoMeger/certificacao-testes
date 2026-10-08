import bcrypt from 'bcrypt';
import { PasswordHasher } from './ports.js';

const DEFAULT_SALT_ROUNDS = 10;

/**
 * PasswordHasher implementation using the industry-standard bcrypt library.
 */
export class BcryptPasswordHasher implements PasswordHasher {
  constructor(private readonly rounds: number = DEFAULT_SALT_ROUNDS) {}

  async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.rounds);
  }

  async verify(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}

/**
 * Alias maintaining compatibility with the existing port references as both type and value.
 */
export type ScryptPasswordHasher = BcryptPasswordHasher;
export const ScryptPasswordHasher = BcryptPasswordHasher;
