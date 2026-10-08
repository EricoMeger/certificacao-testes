import { User, UserRepository } from './ports.js';
import { normalizeEmail } from './email.js';

/**
 * In-memory implementation of UserRepository for testing and isolated usage.
 */
export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();

  async findByEmail(email: string): Promise<User | null> {
    const normalized = normalizeEmail(email);
    for (const user of this.users.values()) {
      if (normalizeEmail(user.email) === normalized) {
        return { ...user };
      }
    }
    return null;
  }

  async save(user: User): Promise<void> {
    this.users.set(user.id, { ...user });
  }

  clear(): void {
    this.users.clear();
  }
}

