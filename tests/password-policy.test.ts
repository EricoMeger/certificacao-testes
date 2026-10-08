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

  describe('RN02 — password complexity (uppercase, lowercase, digit, special)', () => {
    it.each([
      { password: 'abcd1!ef',   missing: 'MISSING_UPPERCASE' as const,  desc: 'no uppercase'   },
      { password: 'ABCD1!EF',   missing: 'MISSING_LOWERCASE' as const,  desc: 'no lowercase'   },
      { password: 'Abcdefg!',   missing: 'MISSING_DIGIT'     as const,  desc: 'no digit'       },
      { password: 'Abcdefg1',   missing: 'MISSING_SPECIAL'   as const,  desc: 'no special char' },
    ])('CT-07/$missing: rejects password with $desc (RN02)', ({ password, missing }) => {
      const result = validatePassword(password, VALID_EMAIL);
      expect(result).toContain(missing);
    });

    it('CT-08: accepts password that meets all complexity rules (RN02)', () => {
      const result = validatePassword('Abcdef1!', VALID_EMAIL);
      expect(result).not.toContain('MISSING_UPPERCASE');
      expect(result).not.toContain('MISSING_LOWERCASE');
      expect(result).not.toContain('MISSING_DIGIT');
      expect(result).not.toContain('MISSING_SPECIAL');
    });

    it('CT-09: reports all missing categories at once (RN02)', () => {
      // 8 lowercase letters — missing uppercase, digit, and special
      const result = validatePassword('abcdefgh', VALID_EMAIL);
      expect(result).toContain('MISSING_UPPERCASE');
      expect(result).toContain('MISSING_DIGIT');
      expect(result).toContain('MISSING_SPECIAL');
      expect(result).not.toContain('MISSING_LOWERCASE');
    });
  });
});
