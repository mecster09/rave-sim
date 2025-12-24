import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import path from 'node:path';
import { promises as fs } from 'node:fs';
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

function authHeader(username = USER, password = PASS) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

describe('Study metadata endpoint', () => {
  const baseUrl = '/RaveWebServices/metadata/studies/Default%20Study/versions/1';

  it('requires authentication', async () => {
    const app = buildServer();

    const res = await app.inject({
      method: 'GET',
      url: baseUrl
    });

    expect(res.statusCode).toBe(401);
  });

  it('returns 404 when study is unknown', async () => {
    const app = buildServer();

    const res = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/metadata/studies/Unknown/versions/1',
      headers: {
        authorization: authHeader()
      }
    });

    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('Study not found');
  });

  it('returns 404 when metadata version is unknown', async () => {
    const app = buildServer();

    const res = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/metadata/studies/Default%20Study/versions/UNKNOWN',
      headers: {
        authorization: authHeader()
      }
    });

    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('Metadata version not found');
  });

  it('returns deterministic study metadata snapshot', async () => {
    const app = buildServer();

    const res = await app.inject({
      method: 'GET',
      url: baseUrl,
      headers: {
        authorization: authHeader()
      }
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/xml');
    expect(res.body).toContain('<FormDef OID="DM" Name="Demographics"');
    expect(res.body).toContain('<CodeList OID="CL.SEX"');
    expect(res.body.trim().endsWith('</ODM>')).toBe(true);
  });

  it('returns golden payload when scenario header is provided', async () => {
    const app = buildServer();

    const res = await app.inject({
      method: 'GET',
      url: baseUrl,
      headers: {
        authorization: authHeader(),
        'x-harness-scenario': 'META-200-GOLDEN'
      }
    });

    expect(res.statusCode).toBe(200);
    const goldenPath = path.resolve('golden-payloads/default/metadata/default-study-1.xml');
    const golden = await fs.readFile(goldenPath, 'utf8');
    expect(res.body).toBe(golden);
  });
});
