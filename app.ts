import express, { type Request, type Response } from 'express';
import { AuthService } from './src/auth-service.js';
import { InMemoryUserRepository } from './src/in-memory-user-repository.js';
import { BcryptPasswordHasher } from './src/scrypt-password-hasher.js';

const app = express();
app.use(express.json());

const userRepository = new InMemoryUserRepository();
const passwordHasher = new BcryptPasswordHasher();
const authService = new AuthService(userRepository, passwordHasher, {
  now: () => new Date(),
});

const getString = (value: unknown): string => typeof value === 'string' ? value : '';

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ ok: true, service: 'auth-api' });
});

app.post('/register', async (req: Request, res: Response) => {
  const email = getString(req.body?.email);
  const password = getString(req.body?.password);

  const result = await authService.register(email, password);

  if (result.ok) {
    return res.status(201).json({ ok: true, userId: result.userId });
  }

  const statusByReason: Record<typeof result.reason, number> = {
    INVALID_EMAIL: 400,
    EMAIL_ALREADY_REGISTERED: 409,
    WEAK_PASSWORD: 400,
  };

  return res.status(statusByReason[result.reason]).json({
    ok: false,
    reason: result.reason,
    ...(result.violations ? { violations: result.violations } : {}),
  });
});

app.post('/login', async (req: Request, res: Response) => {
  const email = getString(req.body?.email);
  const password = getString(req.body?.password);

  const result = await authService.login(email, password);

  if (result.ok) {
    return res.status(200).json({ ok: true, userId: result.userId });
  }

  if (result.reason === 'ACCOUNT_LOCKED') {
    res.setHeader('Retry-After', '900');
    return res.status(429).json({ ok: false, reason: result.reason });
  }

  return res.status(401).json({ ok: false, reason: result.reason });
});

export default app;
