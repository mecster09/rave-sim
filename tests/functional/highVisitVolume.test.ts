import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { buildServer } from '../../src/server';
import { resolveGoldenConfig, type GoldenConfigDefinition } from '../../src/services/goldenGenerator';

const AUTH_USER = 'test-user';
const AUTH_PASS = 'test-pass';

beforeAll(() => {
  process.env.BASIC_AUTH_USER = AUTH_USER;
  process.env.BASIC_AUTH_PASS = AUTH_PASS;
});

afterAll(() => {
  delete process.env.BASIC_AUTH_USER;
  delete process.env.BASIC_AUTH_PASS;
});

type ResolvedConfig = ReturnType<typeof resolveGoldenConfig>;
type HarnessConfigPayload = {
  applyMode: 'apply' | 'applyAndReset';
  config: ResolvedConfig['harnessConfig'];
};

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

async function setFrozenDay(app: ReturnType<typeof buildServer>, day: number) {
  await app.inject({
    method: 'PUT',
    url: '/harness/time',
    headers: {
      'content-type': 'application/json'
    },
    payload: {
      simStudyDay: day,
      freeze: true
    }
  });
}

function responseBodyToString(body: unknown): string {
  if (Buffer.isBuffer(body)) {
    return body.toString('utf8');
  }
  if (typeof body === 'string') {
    return body;
  }
  return '';
}

describe('High visit volume scenario', () => {
  it('respects visit availability and dependencies across study days', async () => {
    const configPath = path.resolve('golden-scenarios/high-visit-volume/config.json');
    const configRaw = await fs.readFile(configPath, 'utf8');
    const definition = JSON.parse(configRaw) as GoldenConfigDefinition;
    const resolved = resolveGoldenConfig(definition);

    const app = buildServer();

    try {
      await applyHarnessConfig(app, {
        applyMode: 'applyAndReset',
        config: resolved.harnessConfig
      });

      await resetHarness(app);

      const subjectKey = '100001';

      await setFrozenDay(app, 0.5);
      const earlyRes = await app.inject({
        method: 'GET',
        url: `/RaveWebServices/studies/${resolved.harnessConfig.studyName}/subjects/${subjectKey}/datasets/regular`,
        headers: {
          authorization: authHeader()
        }
      });

      expect(earlyRes.statusCode).toBe(200);
      const earlyBody = responseBodyToString(earlyRes.body);
      const earlyVisits = Array.from(earlyBody.matchAll(/StudyEventOID="([^"]+)"/g)).map(match => match[1]);
      expect(earlyVisits).toEqual(['VISIT-001']);

      await setFrozenDay(app, 9.25);
      const lateRes = await app.inject({
        method: 'GET',
        url: `/RaveWebServices/studies/${resolved.harnessConfig.studyName}/subjects/${subjectKey}/datasets/regular`,
        headers: {
          authorization: authHeader()
        }
      });

      expect(lateRes.statusCode).toBe(200);
      const lateBody = responseBodyToString(lateRes.body);
      const lateVisits = Array.from(lateBody.matchAll(/StudyEventOID="([^"]+)"/g)).map(match => match[1]);

      expect(lateVisits.length).toBeGreaterThan(earlyVisits.length);
      expect(lateVisits.includes('VISIT-010')).toBe(true);
      expect(lateVisits.includes('VISIT-009')).toBe(true);
      expect(lateVisits.every((visit, index) => visit === `VISIT-${(index + 1).toString().padStart(3, '0')}`)).toBe(true);
      expect(lateVisits.includes('VISIT-011')).toBe(false);
    } finally {
      await app.close();
    }
  });

  it('requires authentication for high visit dataset access', async () => {
    const app = buildServer();

    const res = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/studies/RWS_HIGH_VISIT_VOLUME/datasets/regular'
    });

    expect(res.statusCode).toBe(401);
  });
});
