import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { buildServer } from '../../src/server';
import { resolveGoldenConfig, type GoldenConfigDefinition } from '../../src/services/goldenGenerator';

type ResolvedConfig = ReturnType<typeof resolveGoldenConfig>;
type HarnessConfigPayload = {
  applyMode: 'apply' | 'applyAndReset';
  config: ResolvedConfig['harnessConfig'];
};

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

describe('High subject volume scenario', () => {
  it('serves subjects and datasets within acceptable performance bounds', async () => {
    const configPath = path.resolve('golden-scenarios/high-subject-volume/config.json');
    const configRaw = await fs.readFile(configPath, 'utf8');
    const definition = JSON.parse(configRaw) as GoldenConfigDefinition;
    const resolved = resolveGoldenConfig(definition);

    const app = buildServer();

    try {
      await applyHarnessConfig(app, {
        applyMode: 'applyAndReset',
        config: resolved.harnessConfig
      });

      await app.inject({
        method: 'POST',
        url: '/harness/reset',
        headers: {
          authorization: authHeader()
        }
      });

      await app.inject({
        method: 'PUT',
        url: '/harness/time',
        headers: {
          'content-type': 'application/json'
        },
        payload: {
          simStudyDay: resolved.simStudyDay,
          freeze: resolved.freeze
        }
      });

      const subjectStart = performance.now();
      const subjectsRes = await app.inject({
        method: 'GET',
        url: `/RaveWebServices/studies/${encodeURIComponent(resolved.harnessConfig.studyName)}/Subjects?include=inactive&status=all`,
        headers: {
          authorization: authHeader()
        }
      });
      const subjectDuration = performance.now() - subjectStart;

      expect(subjectsRes.statusCode).toBe(200);
      expect(subjectDuration).toBeLessThan(2000);

      const subjectBody = Buffer.isBuffer(subjectsRes.body)
        ? subjectsRes.body.toString('utf8')
        : subjectsRes.body ?? '';
      const subjectKeys = Array.from(subjectBody.matchAll(/SubjectKey="(\d+)"/g)).map(match => match[1]);
      expect(subjectKeys.length).toBe(resolved.harnessConfig.subjectCount);
      const sortedKeys = [...subjectKeys].sort((a, b) => Number(a) - Number(b));
      expect(subjectKeys).toEqual(sortedKeys);

      const datasetStart = performance.now();
      const datasetRes = await app.inject({
        method: 'GET',
        url: `/RaveWebServices/studies/${encodeURIComponent(resolved.harnessConfig.studyName)}/datasets/regular`,
        headers: {
          authorization: authHeader()
        }
      });
      const datasetDuration = performance.now() - datasetStart;

      expect(datasetRes.statusCode).toBe(200);
      expect(datasetDuration).toBeLessThan(3000);
      const datasetBody = Buffer.isBuffer(datasetRes.body)
        ? datasetRes.body.toString('utf8')
        : datasetRes.body ?? '';
      const subjectDataCount = (datasetBody.match(/<SubjectData /g) || []).length;
      expect(subjectDataCount).toBeGreaterThanOrEqual(Math.floor(resolved.harnessConfig.subjectCount * 0.9));
    } finally {
      await app.close();
    }
  });
});
