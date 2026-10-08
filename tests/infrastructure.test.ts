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

describe('Infrastructure — ScryptPasswordHasher', () => {
  it('returns false when verifying malformed hash strings', async () => {
    const hasher = new ScryptPasswordHasher();

    // No colon delimiter
    expect(await hasher.verify('Password123!', 'invalidhash')).toBe(false);

    // Empty parts
    expect(await hasher.verify('Password123!', ':')).toBe(false);
    expect(await hasher.verify('Password123!', 'part1:part2:part3')).toBe(false);

    // Different key lengths
    const validSalt = '0123456789abcdef0123456789abcdef';
    const shortKey = 'abcd';
    expect(await hasher.verify('Password123!', `${validSalt}:${shortKey}`)).toBe(false);
  });
});
