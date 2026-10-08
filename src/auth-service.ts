import { randomUUID } from 'node:crypto';
import { PasswordViolation, validatePassword } from './password-policy.js';
import { User, UserRepository, PasswordHasher, Clock } from './ports.js';
import { isValidEmail, normalizeEmail } from './email.js';
import { MAX_FAILED_ATTEMPTS, LOCK_MINUTES } from './config.js';

export type RegisterResult =
  | { ok: true; userId: string }
  | {
      ok: false;
      reason: 'INVALID_EMAIL' | 'EMAIL_ALREADY_REGISTERED' | 'WEAK_PASSWORD';
      violations?: PasswordViolation[];
    };

export type LoginResult =
  | { ok: true; userId: string }
  | { ok: false; reason: 'INVALID_CREDENTIALS' | 'ACCOUNT_LOCKED' };

export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly clock: Clock,
  ) {}

  async register(email: string, password: string): Promise<RegisterResult> {
    const normalizedEmail = normalizeEmail(email);

    if (!isValidEmail(normalizedEmail)) {
      return { ok: false, reason: 'INVALID_EMAIL' };
    }

    const violations = validatePassword(password, normalizedEmail);
    if (violations.length > 0) {
      return { ok: false, reason: 'WEAK_PASSWORD', violations };
    }

    const existing = await this.userRepository.findByEmail(normalizedEmail);
    if (existing !== null) {
      return { ok: false, reason: 'EMAIL_ALREADY_REGISTERED' };
    }

    const passwordHash = await this.passwordHasher.hash(password);
    const user = this.createUser(normalizedEmail, passwordHash);
    await this.userRepository.save(user);

    return { ok: true, userId: user.id };
  }

  private createUser(email: string, passwordHash: string): User {
    return {
      id: randomUUID(),
      email,
      passwordHash,
      failedAttempts: 0,
      lockedUntil: null,
    };
  }

  async login(email: string, password: string): Promise<LoginResult> {
    const normalizedEmail = normalizeEmail(email);
    const user = await this.userRepository.findByEmail(normalizedEmail);
    if (!user) {
      return { ok: false, reason: 'INVALID_CREDENTIALS' };
    }

    const now = this.clock.now();

    if (user.lockedUntil !== null) {
      if (now.getTime() < user.lockedUntil.getTime()) {
        return { ok: false, reason: 'ACCOUNT_LOCKED' };
      }
      user.lockedUntil = null;
      user.failedAttempts = 0;
    }

    const isValid = await this.passwordHasher.verify(password, user.passwordHash);
    if (!isValid) {
      user.failedAttempts += 1;
      if (user.failedAttempts >= MAX_FAILED_ATTEMPTS) {
        user.lockedUntil = new Date(now.getTime() + LOCK_MINUTES * 60 * 1000);
      }
      await this.userRepository.save(user);
      return { ok: false, reason: 'INVALID_CREDENTIALS' };
    }

    await this.resetLoginState(user);

    return { ok: true, userId: user.id };
  }

  private async resetLoginState(user: User): Promise<void> {
    user.failedAttempts = 0;
    user.lockedUntil = null;
    await this.userRepository.save(user);
  }
}
