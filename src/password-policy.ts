import { MIN_LENGTH, MAX_LENGTH } from './config.js';

export type PasswordViolation =
  | 'TOO_SHORT'
  | 'TOO_LONG'
  | 'MISSING_UPPERCASE'
  | 'MISSING_LOWERCASE'
  | 'MISSING_DIGIT'
  | 'MISSING_SPECIAL'
  | 'CONTAINS_EMAIL_LOCAL_PART';

/** Declarative list of character-class rules (RN02). */
const COMPLEXITY_RULES: ReadonlyArray<{
  violation: PasswordViolation;
  pattern: RegExp;
}> = [
  { violation: 'MISSING_UPPERCASE', pattern: /[A-Z]/ },
  { violation: 'MISSING_LOWERCASE', pattern: /[a-z]/ },
  { violation: 'MISSING_DIGIT',     pattern: /[0-9]/ },
  { violation: 'MISSING_SPECIAL',   pattern: /[^A-Za-z0-9]/ },
];

/** Returns all violations found; an empty array means the password is valid. */
export function validatePassword(
  password: string,
  _email: string,
): PasswordViolation[] {
  const violations: PasswordViolation[] = [];

  // RN01 — length check
  if (password.length < MIN_LENGTH) {
    violations.push('TOO_SHORT');
  } else if (password.length > MAX_LENGTH) {
    violations.push('TOO_LONG');
  }

  // RN02 — complexity checks
  for (const { violation, pattern } of COMPLEXITY_RULES) {
    if (!pattern.test(password)) {
      violations.push(violation);
    }
  }

  return violations;
}
