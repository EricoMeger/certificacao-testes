import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';

describe('HTTP API', () => {
  it('returns health status', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, service: 'auth-api' });
  });

  it('registers and logs in a valid user', async () => {
    const registerResponse = await request(app)
      .post('/register')
      .send({
        email: 'http-user@example.com',
        password: 'StrongPass1!',
      });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.ok).toBe(true);
    expect(registerResponse.body.userId).toBeTypeOf('string');

    const loginResponse = await request(app)
      .post('/login')
      .send({
        email: 'http-user@example.com',
        password: 'StrongPass1!',
      });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.ok).toBe(true);
    expect(loginResponse.body.userId).toBe(registerResponse.body.userId);
  });

  it('rejects invalid credentials', async () => {
    const response = await request(app)
      .post('/login')
      .send({
        email: 'http-user@example.com',
        password: 'WrongPass1!',
      });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ ok: false, reason: 'INVALID_CREDENTIALS' });
  });
});
