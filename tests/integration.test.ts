import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '../src/domain/auth-service.js';
import { InMemoryUserRepository } from '../src/infrastructure/persistence/in-memory-user-repository.js';
import { BcryptPasswordHasher } from '../src/infrastructure/security/bcrypt-password-hasher.js';
import { Clock } from '../src/domain/ports.js';

describe('Integration — AuthService with real InMemoryUserRepository and BcryptPasswordHasher', () => {
  let repository: InMemoryUserRepository;
  let hasher: BcryptPasswordHasher;
  let clock: Clock;
  let currentTime: Date;
  let authService: AuthService;

  beforeEach(() => {
    repository = new InMemoryUserRepository();
    hasher = new BcryptPasswordHasher(4);
    currentTime = new Date('2026-10-08T12:00:00.000Z');
    clock = {
      now: () => new Date(currentTime.getTime()),
    };
    authService = new AuthService(repository, hasher, clock);
  });

  it('performs end-to-end registration and authenticates with real scrypt hash', async () => {
    const email = 'alice@example.com';
    const password = 'CorrectHorseBattery1!';

    // Register
    const regResult = await authService.register(email, password);
    expect(regResult.ok).toBe(true);
    if (!regResult.ok) return;

    // Verify stored user in repository
    const storedUser = await repository.findByEmail(email);
    expect(storedUser).not.toBeNull();
    expect(storedUser?.passwordHash).toMatch(/^\$2[aby]\$\d{2}\$/);
    expect(storedUser?.passwordHash).not.toContain(password);

    // Login with correct password
    const loginResult = await authService.login(email, password);
    expect(loginResult).toEqual({
      ok: true,
      userId: regResult.userId,
    });
  });

  it('rejects incorrect password with real scrypt hash', async () => {
    const email = 'bob@example.com';
    const password = 'CorrectHorseBattery1!';

    await authService.register(email, password);

    const loginResult = await authService.login(email, 'WrongPassword99!');
    expect(loginResult).toEqual({
      ok: false,
      reason: 'INVALID_CREDENTIALS',
    });

    const user = await repository.findByEmail(email);
    expect(user?.failedAttempts).toBe(1);
  });

  it('locks account after 3 consecutive failures and unlocks after 15 minutes', async () => {
    const email = 'charlie@example.com';
    const password = 'SuperSecret123!';

    await authService.register(email, password);

    // 1st failure
    const f1 = await authService.login(email, 'WrongPass1!');
    expect(f1).toEqual({ ok: false, reason: 'INVALID_CREDENTIALS' });

    // 2nd failure
    const f2 = await authService.login(email, 'WrongPass2!');
    expect(f2).toEqual({ ok: false, reason: 'INVALID_CREDENTIALS' });

    // 3rd failure (triggers 15m lock)
    const f3 = await authService.login(email, 'WrongPass3!');
    expect(f3).toEqual({ ok: false, reason: 'INVALID_CREDENTIALS' });

    // 4th attempt at 14 minutes (account is locked even with correct password)
    currentTime = new Date(currentTime.getTime() + 14 * 60 * 1000);
    const lockedAttempt = await authService.login(email, password);
    expect(lockedAttempt).toEqual({ ok: false, reason: 'ACCOUNT_LOCKED' });

    // 5th attempt at 15 minutes mark (lock expired, correct password succeeds)
    currentTime = new Date(currentTime.getTime() + 1 * 60 * 1000);
    const unlockedAttempt = await authService.login(email, password);
    expect(unlockedAttempt.ok).toBe(true);
  });
});

