import { PasswordViolation, validatePassword } from './password-policy.js';
import { UserRepository, PasswordHasher, Clock } from './ports.js';
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

    return { ok: true, userId: 'naive-id' };
  }

  async login(_email: string, _password: string): Promise<LoginResult> {
    return { ok: true, userId: 'naive-id' };
  }
}
