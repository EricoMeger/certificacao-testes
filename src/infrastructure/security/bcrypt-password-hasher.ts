import bcrypt from 'bcrypt';
import { type PasswordHasher } from '../../domain/ports.js';

const DEFAULT_SALT_ROUNDS = 10;

export class BcryptPasswordHasher implements PasswordHasher {
  constructor(private readonly rounds: number = DEFAULT_SALT_ROUNDS) {}

  async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.rounds);
  }

  async verify(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}

export type ScryptPasswordHasher = BcryptPasswordHasher;
export const ScryptPasswordHasher = BcryptPasswordHasher;
