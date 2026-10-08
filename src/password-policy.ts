// Skeleton — will be implemented via TDD.

import { MIN_LENGTH, MAX_LENGTH } from './config.js';

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
  } else if (password.length > MAX_LENGTH) {
    violations.push('TOO_LONG');
  }

  if (!/[A-Z]/.test(password)) {
    violations.push('MISSING_UPPERCASE');
  }
  if (!/[a-z]/.test(password)) {
    violations.push('MISSING_LOWERCASE');
  }
  if (!/[0-9]/.test(password)) {
    violations.push('MISSING_DIGIT');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    violations.push('MISSING_SPECIAL');
  }

  return violations;
}
