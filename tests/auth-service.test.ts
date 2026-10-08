import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../src/domain/auth-service.js';
import { UserRepository, PasswordHasher, Clock } from '../src/domain/ports.js';

describe('AuthService — register', () => {
  let userRepository: UserRepository;
  let passwordHasher: PasswordHasher;
  let clock: Clock;
  let authService: AuthService;

  const fixedDate = new Date('2026-10-08T10:00:00Z');

  beforeEach(() => {
    userRepository = {
      findByEmail: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue(undefined),
    };
    passwordHasher = {
      hash: vi.fn().mockResolvedValue('hashed_pw'),
      verify: vi.fn().mockResolvedValue(true),
    };
    clock = {
      now: vi.fn().mockReturnValue(fixedDate),
    };
    authService = new AuthService(userRepository, passwordHasher, clock);
  });

  describe('RN04 & RN01-RN03 — registration validation', () => {
    it('CT-13: rejects invalid email format on registration (RN04)', async () => {
      const result = await authService.register('invalid-email', 'StrongPass1!');

      expect(result).toEqual({
        ok: false,
        reason: 'INVALID_EMAIL',
      });
      expect(passwordHasher.hash).not.toHaveBeenCalled();
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('CT-14: rejects weak password on registration and does not hash or save (RN01-RN03, RN05)', async () => {
      const result = await authService.register('user@example.com', 'short');

      expect(result).toEqual({
        ok: false,
        reason: 'WEAK_PASSWORD',
        violations: expect.arrayContaining(['TOO_SHORT']),
      });
      expect(passwordHasher.hash).not.toHaveBeenCalled();
      expect(userRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('RN04 & RN05 — email uniqueness and secure storage', () => {
    it('CT-15: rejects registration when email is already registered (RN04)', async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValueOnce({
        id: 'existing-id',
        email: 'user@example.com',
        passwordHash: 'existing_hash',
        failedAttempts: 0,
        lockedUntil: null,
      });

      const result = await authService.register('user@example.com', 'StrongPass1!');

      expect(result).toEqual({
        ok: false,
        reason: 'EMAIL_ALREADY_REGISTERED',
      });
      expect(passwordHasher.hash).not.toHaveBeenCalled();
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('CT-16: successfully registers user, storing only password hash (RN04, RN05)', async () => {
      const plainPassword = 'StrongPass1!';
      const result = await authService.register('user@example.com', plainPassword);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.userId).toBeDefined();
      }

      expect(passwordHasher.hash).toHaveBeenCalledWith(plainPassword);
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          email: 'user@example.com',
          passwordHash: 'hashed_pw',
          failedAttempts: 0,
          lockedUntil: null,
        }),
      );

      // Verify plaintext password is never passed to repository
      const savedUser = vi.mocked(userRepository.save).mock.calls[0][0];
      expect(JSON.stringify(savedUser)).not.toContain(plainPassword);
    });

    it('CT-17: uses trimmed and lowercased email for uniqueness check and persistence (RN04)', async () => {
      await authService.register('   NewUser@Domain.COM  ', 'StrongPass1!');

      expect(userRepository.findByEmail).toHaveBeenCalledWith('newuser@domain.com');
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newuser@domain.com',
        }),
      );
    });
  });

  describe('RN06 — login authentication', () => {
    it('CT-18: returns INVALID_CREDENTIALS when user does not exist (RN06, anti-enumeration)', async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValueOnce(null);

      const result = await authService.login('unknown@example.com', 'AnyPass1!');

      expect(result).toEqual({
        ok: false,
        reason: 'INVALID_CREDENTIALS',
      });
      expect(passwordHasher.verify).not.toHaveBeenCalled();
    });

    it('CT-19: returns INVALID_CREDENTIALS and increments failedAttempts on incorrect password (RN06)', async () => {
      const existingUser = {
        id: 'u-1',
        email: 'user@example.com',
        passwordHash: 'hashed_pw',
        failedAttempts: 0,
        lockedUntil: null,
      };
      vi.mocked(userRepository.findByEmail).mockResolvedValueOnce(existingUser);
      vi.mocked(passwordHasher.verify).mockResolvedValueOnce(false);

      const result = await authService.login('user@example.com', 'WrongPass1!');

      expect(result).toEqual({
        ok: false,
        reason: 'INVALID_CREDENTIALS',
      });
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'u-1',
          failedAttempts: 1,
        }),
      );
    });

    it('CT-20: returns success and resets failedAttempts on correct password (RN06)', async () => {
      const existingUser = {
        id: 'u-1',
        email: 'user@example.com',
        passwordHash: 'hashed_pw',
        failedAttempts: 2,
        lockedUntil: null,
      };
      vi.mocked(userRepository.findByEmail).mockResolvedValueOnce(existingUser);
      vi.mocked(passwordHasher.verify).mockResolvedValueOnce(true);

      const result = await authService.login('user@example.com', 'CorrectPass1!');

      expect(result).toEqual({
        ok: true,
        userId: 'u-1',
      });
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'u-1',
          failedAttempts: 0,
        }),
      );
    });

    it('CT-21: triggers 15-minute lock on 3rd consecutive failed attempt (RN06, boundary 3)', async () => {
      const lockStartTime = new Date('2026-10-08T10:00:00.000Z');
      vi.mocked(clock.now).mockReturnValue(lockStartTime);

      const existingUser = {
        id: 'u-1',
        email: 'user@example.com',
        passwordHash: 'hashed_pw',
        failedAttempts: 2,
        lockedUntil: null,
      };
      vi.mocked(userRepository.findByEmail).mockResolvedValueOnce(existingUser);
      vi.mocked(passwordHasher.verify).mockResolvedValueOnce(false);

      const result = await authService.login('user@example.com', 'WrongPass1!');

      // The 3rd failure still returns INVALID_CREDENTIALS
      expect(result).toEqual({
        ok: false,
        reason: 'INVALID_CREDENTIALS',
      });

      const expectedLock = new Date('2026-10-08T10:15:00.000Z');
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'u-1',
          failedAttempts: 3,
          lockedUntil: expectedLock,
        }),
      );
    });

    it('CT-22: returns ACCOUNT_LOCKED when account is currently locked, even with correct password (RN06, boundary 14:59)', async () => {
      // Locked at 10:00:00, locked until 10:15:00. At 10:14:59 (14 min 59s), account is locked.
      const lockedUntil = new Date('2026-10-08T10:15:00.000Z');
      const testTime = new Date('2026-10-08T10:14:59.000Z');
      vi.mocked(clock.now).mockReturnValue(testTime);

      const existingUser = {
        id: 'u-1',
        email: 'user@example.com',
        passwordHash: 'hashed_pw',
        failedAttempts: 3,
        lockedUntil,
      };
      vi.mocked(userRepository.findByEmail).mockResolvedValueOnce(existingUser);

      const result = await authService.login('user@example.com', 'CorrectPass1!');

      expect(result).toEqual({
        ok: false,
        reason: 'ACCOUNT_LOCKED',
      });
      expect(passwordHasher.verify).not.toHaveBeenCalled();
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('CT-23: unlocks account when lock duration has expired (now == lockedUntil) (RN06, boundary 15:00)', async () => {
      // Exactly at lockedUntil (10:15:00), account is treated as unlocked
      const lockedUntil = new Date('2026-10-08T10:15:00.000Z');
      vi.mocked(clock.now).mockReturnValue(lockedUntil);

      const existingUser = {
        id: 'u-1',
        email: 'user@example.com',
        passwordHash: 'hashed_pw',
        failedAttempts: 3,
        lockedUntil,
      };
      vi.mocked(userRepository.findByEmail).mockResolvedValueOnce(existingUser);
      vi.mocked(passwordHasher.verify).mockResolvedValueOnce(true);

      const result = await authService.login('user@example.com', 'CorrectPass1!');

      expect(result).toEqual({
        ok: true,
        userId: 'u-1',
      });
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'u-1',
          failedAttempts: 0,
          lockedUntil: null,
        }),
      );
    });

    it('CT-24: resets counter after lock expiry and handles wrong password cleanly (RN06, boundary 15:01)', async () => {
      // At 10:15:01 (15m01s), lock has expired. Counter resets, and a wrong password increments it to 1.
      const lockedUntil = new Date('2026-10-08T10:15:00.000Z');
      const testTime = new Date('2026-10-08T10:15:01.000Z');
      vi.mocked(clock.now).mockReturnValue(testTime);

      const existingUser = {
        id: 'u-1',
        email: 'user@example.com',
        passwordHash: 'hashed_pw',
        failedAttempts: 3,
        lockedUntil,
      };
      vi.mocked(userRepository.findByEmail).mockResolvedValueOnce(existingUser);
      vi.mocked(passwordHasher.verify).mockResolvedValueOnce(false);

      const result = await authService.login('user@example.com', 'WrongPass1!');

      expect(result).toEqual({
        ok: false,
        reason: 'INVALID_CREDENTIALS',
      });
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'u-1',
          failedAttempts: 1,
          lockedUntil: null,
        }),
      );
    });
  });
});
