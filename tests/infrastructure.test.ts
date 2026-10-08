import { describe, it, expect } from 'vitest';
import { InMemoryUserRepository } from '../src/in-memory-user-repository.js';
import { ScryptPasswordHasher } from '../src/scrypt-password-hasher.js';
import { User } from '../src/ports.js';

describe('Infrastructure — InMemoryUserRepository', () => {
  it('saves and finds user by normalized email', async () => {
    const repo = new InMemoryUserRepository();
    const user: User = {
      id: 'id-1',
      email: 'user@example.com',
      passwordHash: 'hash',
      failedAttempts: 0,
      lockedUntil: null,
    };

    await repo.save(user);

    const found = await repo.findByEmail('  USER@example.COM  ');
    expect(found).toEqual(user);
  });

  it('clears all users when clear() is called', async () => {
    const repo = new InMemoryUserRepository();
    await repo.save({
      id: 'id-1',
      email: 'user@example.com',
      passwordHash: 'hash',
      failedAttempts: 0,
      lockedUntil: null,
    });

    repo.clear();

    const found = await repo.findByEmail('user@example.com');
    expect(found).toBeNull();
  });
});

describe('Infrastructure — PasswordHasher (bcrypt)', () => {
  it('hashes and verifies plain password successfully', async () => {
    const hasher = new ScryptPasswordHasher(4);
    const hash = await hasher.hash('Password123!');

    expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/);
    expect(await hasher.verify('Password123!', hash)).toBe(true);
    expect(await hasher.verify('WrongPassword!', hash)).toBe(false);
  });

  it('returns false when verifying malformed hash strings', async () => {
    const hasher = new ScryptPasswordHasher(4);

    expect(await hasher.verify('Password123!', 'invalidhash')).toBe(false);
    expect(await hasher.verify('Password123!', '')).toBe(false);
    expect(await hasher.verify('Password123!', '$2b$10$malformedhashvalue')).toBe(false);
  });
});

