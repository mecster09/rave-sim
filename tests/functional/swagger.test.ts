import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildServer } from '../../src/server';

const USER = 'test-user';
const PASS = 'test-pass';

function basicAuthHeader(username: string, password: string) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

beforeEach(() => {
  process.env.BASIC_AUTH_USER = USER;
  process.env.BASIC_AUTH_PASS = PASS;
});

afterEach(() => {
  delete process.env.BASIC_AUTH_USER;
  delete process.env.BASIC_AUTH_PASS;
});

describe('Swagger documentation', () => {
  it('requires authentication for the OpenAPI document', async () => {
    const app = buildServer();

    const res = await app.inject({
      method: 'GET',
      url: '/swagger.json'
    });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('serves the OpenAPI document when authorized', async () => {
    const app = buildServer();

    const res = await app.inject({
      method: 'GET',
      url: '/swagger.json',
      headers: {
        authorization: basicAuthHeader(USER, PASS)
      }
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');

    const payload = res.json();
    expect(payload.openapi).toBe('3.1.0');
    expect(payload.paths).toHaveProperty('/health');
  });

  it('serves the Swagger UI HTML when authorized', async () => {
    const app = buildServer();

    const res = await app.inject({
      method: 'GET',
      url: '/docs',
      headers: {
        authorization: basicAuthHeader(USER, PASS)
      }
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.body).toContain('Swagger UI');
  });
});
