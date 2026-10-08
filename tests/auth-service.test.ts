import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../src/auth-service.js';
import { UserRepository, PasswordHasher, Clock } from '../src/ports.js';

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
});
