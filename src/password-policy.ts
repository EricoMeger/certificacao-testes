// Skeleton — will be implemented via TDD.

import { MIN_LENGTH } from './config.js';

export type PasswordViolation =
  | 'TOO_SHORT'
  | 'TOO_LONG'
  | 'MISSING_UPPERCASE'
  | 'MISSING_LOWERCASE'
  | 'MISSING_DIGIT'
  | 'MISSING_SPECIAL'
  | 'CONTAINS_EMAIL_LOCAL_PART';

/** Returns all violations found; an empty array means the password is valid. */
export function validatePassword(
  password: string,
  _email: string,
): PasswordViolation[] {
  const violations: PasswordViolation[] = [];

  if (password.length < MIN_LENGTH) {
    violations.push('TOO_SHORT');
  }

  if (password.length > 64) {
    violations.push('TOO_LONG');
  }

  return violations;
}
