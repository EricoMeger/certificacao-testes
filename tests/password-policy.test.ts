import { describe, it, expect } from 'vitest';
import { validatePassword } from '../src/password-policy.js';

describe('validatePassword', () => {
  // Valid baseline password used when testing rules other than length.
  const VALID_EMAIL = 'user@example.com';

  describe('RN01 — password length (8–64 characters)', () => {
    it('CT-01: rejects password with 7 characters (RN01, lower boundary - 1)', () => {
      // 7 chars = "Aa1!xyz" — meets all other rules but is too short
      const result = validatePassword('Aa1!xyz', VALID_EMAIL);
      expect(result).toContain('TOO_SHORT');
    });

    it('CT-02: accepts password with exactly 8 characters (RN01, lower boundary)', () => {
      // 8 chars = "Aa1!xyzw"
      const result = validatePassword('Aa1!xyzw', VALID_EMAIL);
      expect(result).not.toContain('TOO_SHORT');
    });

    it('CT-03: accepts password with 9 characters (RN01, lower boundary + 1)', () => {
      const result = validatePassword('Aa1!xyzwk', VALID_EMAIL);
      expect(result).not.toContain('TOO_SHORT');
    });

    it('CT-04: accepts password with 63 characters (RN01, upper boundary - 1)', () => {
      // 63-char password: "Aa1!" + 59 lowercase letters
      const password = 'Aa1!' + 'b'.repeat(59);
      const result = validatePassword(password, VALID_EMAIL);
      expect(result).not.toContain('TOO_LONG');
    });

    it('CT-05: accepts password with exactly 64 characters (RN01, upper boundary)', () => {
      const password = 'Aa1!' + 'b'.repeat(60);
      const result = validatePassword(password, VALID_EMAIL);
      expect(result).not.toContain('TOO_LONG');
    });

    it('CT-06: rejects password with 65 characters (RN01, upper boundary + 1)', () => {
      const password = 'Aa1!' + 'b'.repeat(61);
      const result = validatePassword(password, VALID_EMAIL);
      expect(result).toContain('TOO_LONG');
    });
  });
});
