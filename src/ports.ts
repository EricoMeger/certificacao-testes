export interface User {
  id: string;
  email: string;
  passwordHash: string;
  failedAttempts: number;
  lockedUntil: Date | null;
}

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<void>;
}

export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(plain: string, hash: string): Promise<boolean>;
}

export interface Clock {
  now(): Date;
}

