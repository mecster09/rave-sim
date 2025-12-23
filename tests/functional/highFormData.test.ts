import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import crypto from 'node:crypto';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { buildServer } from '../../src/server';
import { resolveGoldenConfig, type GoldenConfigDefinition } from '../../src/services/goldenGenerator';

const AUTH_USER = 'test-user';
const AUTH_PASS = 'test-pass';

type ResolvedConfig = ReturnType<typeof resolveGoldenConfig>;
type HarnessConfigPayload = {
  applyMode: 'apply' | 'applyAndReset';
  config: ResolvedConfig['harnessConfig'];
};

beforeAll(() => {
  process.env.BASIC_AUTH_USER = AUTH_USER;
  process.env.BASIC_AUTH_PASS = AUTH_PASS;
});

afterAll(() => {
  delete process.env.BASIC_AUTH_USER;
  delete process.env.BASIC_AUTH_PASS;
});

function authHeader(username = AUTH_USER, password = AUTH_PASS) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

async function applyHarnessConfig(app: ReturnType<typeof buildServer>, payload: HarnessConfigPayload) {
  await app.inject({
    method: 'PUT',
    url: '/harness/config',
    headers: {
      authorization: authHeader(),
      'content-type': 'application/json'
    },
    payload
  });
}

async function resetHarness(app: ReturnType<typeof buildServer>) {
  await app.inject({
    method: 'POST',
    url: '/harness/reset',
    headers: {
      authorization: authHeader()
    }
  });
}

async function freezeHarness(app: ReturnType<typeof buildServer>, studyDay: number, freeze: boolean) {
  await app.inject({
    method: 'PUT',
    url: '/harness/time',
    headers: {
      'content-type': 'application/json'
    },
    payload: {
      simStudyDay: studyDay,
      freeze
    }
  });
}

function bodyToString(body: unknown): string {
  if (Buffer.isBuffer(body)) {
    return body.toString('utf8');
  }
  if (typeof body === 'string') {
    return body;
  }
  return '';
}

describe('High form data scenario', () => {
  it('requires authentication for dataset access', async () => {
    const app = buildServer();

    const res = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/studies/RWS_HIGH_FORM_DATA/datasets/regular'
    });

    expect(res.statusCode).toBe(401);
  });

  it('produces dense form payloads with stable ordering', async () => {
    const defaultConfigPath = path.resolve('golden-scenarios/default/config.json');
    const defaultConfigRaw = await fs.readFile(defaultConfigPath, 'utf8');
    const defaultDefinition = JSON.parse(defaultConfigRaw) as GoldenConfigDefinition;
    const defaultResolved = resolveGoldenConfig(defaultDefinition);

    const highConfigPath = path.resolve('golden-scenarios/high-form-data/config.json');
    const highConfigRaw = await fs.readFile(highConfigPath, 'utf8');
    const highDefinition = JSON.parse(highConfigRaw) as GoldenConfigDefinition;
    const highResolved = resolveGoldenConfig(highDefinition);

    const app = buildServer();

    try {
      await applyHarnessConfig(app, {
        applyMode: 'applyAndReset',
        config: defaultResolved.harnessConfig
      });
      await resetHarness(app);
      await freezeHarness(app, defaultResolved.simStudyDay, defaultResolved.freeze);

      const defaultRes = await app.inject({
        method: 'GET',
        url: '/RaveWebServices/studies/Default%20Study/datasets/regular',
        headers: {
          authorization: authHeader()
        }
      });

      expect(defaultRes.statusCode).toBe(200);
      const defaultBody = bodyToString(defaultRes.body);
      const defaultItemCount = (defaultBody.match(/<ItemData /g) || []).length;

      await applyHarnessConfig(app, {
        applyMode: 'applyAndReset',
        config: highResolved.harnessConfig
      });
      await resetHarness(app);
      await freezeHarness(app, highResolved.simStudyDay, highResolved.freeze);

      const firstHighRes = await app.inject({
        method: 'GET',
        url: '/RaveWebServices/studies/RWS_HIGH_FORM_DATA/datasets/regular',
        headers: {
          authorization: authHeader()
        }
      });

      expect(firstHighRes.statusCode).toBe(200);
      const highBody = bodyToString(firstHighRes.body);
      const highItemCount = (highBody.match(/<ItemData /g) || []).length;
      expect(highItemCount).toBeGreaterThan(defaultItemCount);

      const formOids = new Set(Array.from(highBody.matchAll(/FormOID="([^\"]+)"/g)).map(match => match[1]));
      expect(formOids.has('DM')).toBe(true);
      expect(formOids.has('VS')).toBe(true);
      expect(formOids.has('AE')).toBe(true);

      const firstHash = crypto.createHash('sha256').update(highBody).digest('hex');

      const secondHighRes = await app.inject({
        method: 'GET',
        url: '/RaveWebServices/studies/RWS_HIGH_FORM_DATA/datasets/regular',
        headers: {
          authorization: authHeader()
        }
      });

      expect(secondHighRes.statusCode).toBe(200);
      const secondBody = bodyToString(secondHighRes.body);
      const secondHash = crypto.createHash('sha256').update(secondBody).digest('hex');
      expect(secondHash).toBe(firstHash);
    } finally {
      await app.close();
    }
  });
});
