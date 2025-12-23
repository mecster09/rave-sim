import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildServer } from '../../src/server';

const USER = 'test-user';
const PASS = 'test-pass';

beforeEach(() => {
  process.env.BASIC_AUTH_USER = USER;
  process.env.BASIC_AUTH_PASS = PASS;
});

afterEach(() => {
  delete process.env.BASIC_AUTH_USER;
  delete process.env.BASIC_AUTH_PASS;
});

function basicAuthHeader(username: string, password: string) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

describe('GET /health', () => {
  it('returns status ok', async () => {
    const app = buildServer();

    const res = await app.inject({
      method: 'GET',
      url: '/health'
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });

  it('returns 404 for unknown route', async () => {
    const app = buildServer();

    const res = await app.inject({
      method: 'GET',
      url: '/not-found',
      headers: {
        authorization: basicAuthHeader(USER, PASS)
      }
    });

    expect(res.statusCode).toBe(404);
  });
});

describe('GET /protected-ping', () => {
  it('returns 401 when authorization header is missing', async () => {
    const app = buildServer();

    const res = await app.inject({
      method: 'GET',
      url: '/protected-ping'
    });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: 'Unauthorized' });
    expect(res.headers['www-authenticate']).toBe('Basic realm="Restricted"');
  });

  it('returns 401 when credentials are invalid', async () => {
    const app = buildServer();

    const res = await app.inject({
      method: 'GET',
      url: '/protected-ping',
      headers: {
        authorization: basicAuthHeader(USER, 'wrong')
      }
    });

    expect(res.statusCode).toBe(401);
  });

  it('returns 200 when credentials are valid', async () => {
    const app = buildServer();

    const res = await app.inject({
      method: 'GET',
      url: '/protected-ping',
      headers: {
        authorization: basicAuthHeader(USER, PASS)
      }
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });
});
