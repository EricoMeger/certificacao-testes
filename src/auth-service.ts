import { PasswordViolation } from './password-policy.js';
import { UserRepository, PasswordHasher, Clock } from './ports.js';

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

  async register(_email: string, _password: string): Promise<RegisterResult> {
    return { ok: true, userId: 'naive-id' };
  }

  async login(_email: string, _password: string): Promise<LoginResult> {
    return { ok: true, userId: 'naive-id' };
  }
}
