import { MIN_LENGTH, MAX_LENGTH } from './config.js';

export type PasswordViolation =
  | 'TOO_SHORT'
  | 'TOO_LONG'
  | 'MISSING_UPPERCASE'
  | 'MISSING_LOWERCASE'
  | 'MISSING_DIGIT'
  | 'MISSING_SPECIAL'
  | 'CONTAINS_EMAIL_LOCAL_PART';

const COMPLEXITY_RULES: ReadonlyArray<{
  violation: PasswordViolation;
  pattern: RegExp;
}> = [
  { violation: 'MISSING_UPPERCASE', pattern: /[A-Z]/ },
  { violation: 'MISSING_LOWERCASE', pattern: /[a-z]/ },
  { violation: 'MISSING_DIGIT', pattern: /[0-9]/ },
  { violation: 'MISSING_SPECIAL', pattern: /[^A-Za-z0-9]/ },
];

function extractLocalPart(email: string): string {
  const atIndex = email.indexOf('@');
  const rawLocalPart = atIndex !== -1 ? email.slice(0, atIndex) : email;
  return rawLocalPart.trim().toLowerCase();
}

export function validatePassword(
  password: string,
  email: string,
): PasswordViolation[] {
  const violations: PasswordViolation[] = [];

  if (password.length < MIN_LENGTH) {
    violations.push('TOO_SHORT');
  } else if (password.length > MAX_LENGTH) {
    violations.push('TOO_LONG');
  }

  for (const { violation, pattern } of COMPLEXITY_RULES) {
    if (!pattern.test(password)) {
      violations.push(violation);
    }
  }

  const localPart = extractLocalPart(email);
  if (localPart.length > 0 && password.toLowerCase().includes(localPart)) {
    violations.push('CONTAINS_EMAIL_LOCAL_PART');
  }

  return violations;
}
