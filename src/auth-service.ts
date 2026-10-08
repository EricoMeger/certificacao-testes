import { randomUUID } from 'node:crypto';
import { PasswordViolation, validatePassword } from './password-policy.js';
import { User, UserRepository, PasswordHasher, Clock } from './ports.js';
import { isValidEmail, normalizeEmail } from './email.js';

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
    const userId = randomUUID();
    const user: User = {
      id: userId,
      email: normalizedEmail,
      passwordHash,
      failedAttempts: 0,
      lockedUntil: null,
    };

    await this.userRepository.save(user);

    return { ok: true, userId };
  }

  async login(_email: string, _password: string): Promise<LoginResult> {
    return { ok: true, userId: 'naive-id' };
  }
}
