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
  });
});
