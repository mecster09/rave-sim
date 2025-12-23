import { describe, it, expect } from 'vitest';
import { buildServer } from '../../src/server';

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
      url: '/not-found'
    });

    expect(res.statusCode).toBe(404);
  });
});
