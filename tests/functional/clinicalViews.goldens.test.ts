import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { buildServer } from '../../src/server';
import { sha256Hex } from '../../src/services/goldenGenerator';

type GoldenScenarioEntry = {
  family: string;
  name: string;
  file: string;
  sha256: string;
  statusCode: number;
};

type ClinicalViewsScenario = {
  family: string;
  name: string;
  request: {
    method?: string;
    url: string;
  };
};

type ClinicalViewsConfigDefinition = {
  harnessConfig: Record<string, unknown>;
  simStudyDay: number;
  freeze: boolean;
  scenarios: ClinicalViewsScenario[];
};

const USER = 'test-user';
const PASS = 'test-pass';
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const CONFIG_PATH = path.join(PROJECT_ROOT, 'golden-scenarios', 'clinical-views', 'config.json');
const MANIFEST_PATH = path.join(PROJECT_ROOT, 'golden-payloads', 'ClinicalViews', 'manifest.json');

function authHeader(username = USER, password = PASS) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

function toAbsolutePayloadPath(relativePosixPath: string) {
  return path.join(PROJECT_ROOT, 'golden-payloads', ...relativePosixPath.split('/'));
}

async function readFileUtf8(filePath: string) {
  return fs.readFile(filePath, 'utf8');
}

function extractItemOrder(xml: string, formOid: string) {
  const formRegex = new RegExp(`<FormData FormOID="${formOid}">([\\s\\S]*?)</FormData>`);
  const match = xml.match(formRegex);
  if (!match) {
    return [] as string[];
  }
  const [, segment] = match;
  const items = Array.from(segment.matchAll(/ItemData ItemOID="([^\"]+)"/g)).map(result => result[1]);
  return items;
}

const FIXED_NOW = Date.UTC(2024, 0, 1, 0, 0, 0, 0);

async function applyClinicalViewsScenario(app: ReturnType<typeof buildServer>, config: ClinicalViewsConfigDefinition) {
  const originalNow = Date.now;
  Date.now = () => FIXED_NOW;
  try {
    const configResponse = await app.inject({
      method: 'PUT',
      url: '/harness/config',
      headers: {
        authorization: authHeader(),
        'content-type': 'application/json'
      },
      payload: {
        applyMode: 'applyAndReset',
        config: config.harnessConfig
      }
    });
    expect(configResponse.statusCode).toBe(200);

    const resetResponse = await app.inject({
      method: 'POST',
      url: '/harness/reset',
      headers: {
        authorization: authHeader()
      }
    });
    expect(resetResponse.statusCode).toBe(200);

    const timeResponse = await app.inject({
      method: 'PUT',
      url: '/harness/time',
      headers: {
        'content-type': 'application/json'
      },
      payload: {
        simStudyDay: config.simStudyDay,
        freeze: config.freeze
      }
    });
    expect(timeResponse.statusCode).toBe(200);
  } finally {
    Date.now = originalNow;
  }
}

describe('Clinical Views golden payloads', () => {
  let app: ReturnType<typeof buildServer> | undefined;
  let config: ClinicalViewsConfigDefinition;
  let manifestEntries: Map<string, GoldenScenarioEntry>;
  let scenariosByName: Map<string, ClinicalViewsScenario>;

  beforeAll(async () => {
    const [configContent, manifestContent] = await Promise.all([
      readFileUtf8(CONFIG_PATH),
      readFileUtf8(MANIFEST_PATH)
    ]);

    config = JSON.parse(configContent) as ClinicalViewsConfigDefinition;
    const manifest = JSON.parse(manifestContent) as { scenarios: GoldenScenarioEntry[] };
    manifestEntries = new Map(manifest.scenarios.map(entry => [entry.name, entry]));
    scenariosByName = new Map(
      config.scenarios.map(entry => [entry.name, entry])
    );
  });

  beforeEach(() => {
    process.env.BASIC_AUTH_USER = USER;
    process.env.BASIC_AUTH_PASS = PASS;
    app = buildServer();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
    delete process.env.BASIC_AUTH_USER;
    delete process.env.BASIC_AUTH_PASS;
  });

  it('matches the golden regular snapshot without raw-only fields', async () => {
    expect(app).toBeDefined();
    await applyClinicalViewsScenario(app!, config);

    const scenario = scenariosByName.get('CV-REG-001');
    expect(scenario).toBeDefined();

    const response = await app!.inject({
      method: scenario?.request.method ?? 'GET',
      url: scenario!.request.url,
      headers: {
        authorization: authHeader()
      }
    });

    expect(response.statusCode).toBe(200);
    const entry = manifestEntries.get('CV-REG-001');
    expect(entry).toBeDefined();
    const expected = await readFileUtf8(toAbsolutePayloadPath(entry!.file));
    expect(response.body).toBe(expected);
    expect(response.body).not.toMatch(/ItemOID="[A-Z0-9.]+_RAW"/);
    expect(response.body).not.toMatch(/MeasurementUnitRef/);

    const dmOrder = extractItemOrder(response.body, 'DM');
    expect(dmOrder.slice(0, 3)).toEqual(['AGE', 'BRTHDTC', 'SEX']);

    const hash = sha256Hex(Buffer.from(response.body));
    expect(hash).toBe(entry!.sha256);
  });

  it('matches the golden raw snapshot including measurement units', async () => {
    expect(app).toBeDefined();
    await applyClinicalViewsScenario(app!, config);

    const scenario = scenariosByName.get('CV-RAW-001');
    expect(scenario).toBeDefined();

    const response = await app!.inject({
      method: scenario?.request.method ?? 'GET',
      url: scenario!.request.url,
      headers: {
        authorization: authHeader()
      }
    });

    expect(response.statusCode).toBe(200);
    const entry = manifestEntries.get('CV-RAW-001');
    expect(entry).toBeDefined();
    const expected = await readFileUtf8(toAbsolutePayloadPath(entry!.file));
    expect(response.body).toBe(expected);
    expect(response.body).toMatch(/MeasurementUnitRef/);
    expect(response.body).toMatch(/ItemOID="SYS" Value="\d+ mmHg"/);
    expect(response.body).toMatch(/ItemOID="SYS_DEC"/);

    const dmOrder = extractItemOrder(response.body, 'DM');
    expect(dmOrder.slice(0, 6)).toEqual([
      'AGE',
      'AGE_DEC',
      'BRTHDTC',
      'BRTHDTC_DEC',
      'DM.VERSION',
      'SEX'
    ]);

    const hash = sha256Hex(Buffer.from(response.body));
    expect(hash).toBe(entry!.sha256);
  });

  it('matches the golden regular snapshot with raw suffix appended', async () => {
    expect(app).toBeDefined();
    await applyClinicalViewsScenario(app!, config);

    const scenario = scenariosByName.get('CV-REG-RAW-001');
    expect(scenario).toBeDefined();

    const response = await app!.inject({
      method: scenario?.request.method ?? 'GET',
      url: scenario!.request.url,
      headers: {
        authorization: authHeader()
      }
    });

    expect(response.statusCode).toBe(200);
    const entry = manifestEntries.get('CV-REG-RAW-001');
    expect(entry).toBeDefined();
    const expected = await readFileUtf8(toAbsolutePayloadPath(entry!.file));
    expect(response.body).toBe(expected);
    expect(response.body).toMatch(/ItemOID="BRTHDTC" Value="\d{4}-\d{2}-\d{2}"/);
    expect(response.body).toMatch(/ItemOID="BRTHDTC_RAW" Value="\d{2} [A-Z]{3} \d{4}"/);

    const dmOrder = extractItemOrder(response.body, 'DM');
    expect(dmOrder.slice(0, 6)).toEqual([
      'AGE',
      'AGE_RAW',
      'BRTHDTC',
      'BRTHDTC_RAW',
      'SEX',
      'SEX_RAW'
    ]);

    const hash = sha256Hex(Buffer.from(response.body));
    expect(hash).toBe(entry!.sha256);
  });

  it('rejects rawsuffix usage on raw dataset endpoints with 400', async () => {
    expect(app).toBeDefined();
    await applyClinicalViewsScenario(app!, config);

    const response = await app!.inject({
      method: 'GET',
      url: '/RaveWebServices/studies/Default%20Study/datasets/raw?rawsuffix=_RAW',
      headers: {
        authorization: authHeader()
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: 'rawsuffix is only supported on regular dataset endpoints' });
  });

  it('produces deterministic payloads across repeated runs', async () => {
    expect(app).toBeDefined();

    const scenarioNames = ['CV-REG-001', 'CV-RAW-001', 'CV-REG-RAW-001'];

    for (const name of scenarioNames) {
      const scenario = scenariosByName.get(name);
      const manifestEntry = manifestEntries.get(name);
      expect(scenario).toBeDefined();
      expect(manifestEntry).toBeDefined();

      await applyClinicalViewsScenario(app!, config);
      const first = await app!.inject({
        method: scenario?.request.method ?? 'GET',
        url: scenario!.request.url,
        headers: {
          authorization: authHeader()
        }
      });
      expect(first.statusCode).toBe(200);

      await applyClinicalViewsScenario(app!, config);
      const second = await app!.inject({
        method: scenario?.request.method ?? 'GET',
        url: scenario!.request.url,
        headers: {
          authorization: authHeader()
        }
      });
      expect(second.statusCode).toBe(200);

      expect(first.body).toBe(second.body);
      const expected = await readFileUtf8(toAbsolutePayloadPath(manifestEntry!.file));
      expect(first.body).toBe(expected);
    }
  });
});
