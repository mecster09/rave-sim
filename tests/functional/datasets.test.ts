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

function authHeader(username = USER, password = PASS) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

async function freezeStudyDay(app: ReturnType<typeof buildServer>, day: number) {
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

function extractVisitOids(xml: string) {
  return Array.from(xml.matchAll(/StudyEventOID="([^"]+)"/g)).map(match => match[1]);
}

function extractFormOids(xml: string) {
  return Array.from(xml.matchAll(/FormOID="([^"]+)"/g)).map(match => match[1]);
}

async function resolveStartIso(app: ReturnType<typeof buildServer>, day: number) {
  const res = await app.inject({
    method: 'GET',
    url: '/harness/time'
  });
  expect(res.statusCode).toBe(200);
  const body = res.json() as {
    simClock: {
      simStartWallClock: number;
      simSpeedMinutesPerDay: number;
    };
  };
  const { simStartWallClock, simSpeedMinutesPerDay } = body.simClock;
  const millis = simStartWallClock + day * simSpeedMinutesPerDay * 60000;
  return new Date(millis).toISOString();
}

describe('Clinical view datasets', () => {
  it('requires authentication', async () => {
    const app = buildServer();

    const res = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/studies/Default%20Study/datasets/regular'
    });

    expect(res.statusCode).toBe(401);
  });

  it('includes only visits available for the current study day', async () => {
    const app = buildServer();
    await freezeStudyDay(app, 0.4);

    const res = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/studies/Default%20Study/datasets/regular',
      headers: {
        authorization: authHeader()
      }
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/xml');
    const visits = extractVisitOids(res.body);
    expect(new Set(visits)).toEqual(new Set(['VISIT-001']));
  });

  it('filters by form OID when provided', async () => {
    const app = buildServer();
    await freezeStudyDay(app, 2.5);

    const res = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/studies/Default%20Study/datasets/regular/VS',
      headers: {
        authorization: authHeader()
      }
    });

    expect(res.statusCode).toBe(200);
    const forms = extractFormOids(res.body);
    expect(forms.length).toBeGreaterThan(0);
    expect(new Set(forms)).toEqual(new Set(['VS']));
  });

  it('filters by subject key when provided', async () => {
    const app = buildServer();
    await freezeStudyDay(app, 2.5);

    const res = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/studies/Default%20Study/subjects/100001/datasets/regular',
      headers: {
        authorization: authHeader()
      }
    });

    expect(res.statusCode).toBe(200);
    const subjectKeys = Array.from(res.body.matchAll(/SubjectKey="([^"]+)"/g)).map(match => match[1]);
    expect(new Set(subjectKeys)).toEqual(new Set(['100001']));
  });

  it('returns 404 for unknown subject', async () => {
    const app = buildServer();

    const res = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/studies/Default%20Study/subjects/999999/datasets/regular',
      headers: {
        authorization: authHeader()
      }
    });

    expect(res.statusCode).toBe(404);
  });

  it('validates subject key format', async () => {
    const app = buildServer();

    const res = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/studies/Default%20Study/subjects/not-a-number/datasets/regular',
      headers: {
        authorization: authHeader()
      }
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('Invalid subjectKey');
  });

  it('validates form oid input', async () => {
    const app = buildServer();

    const res = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/studies/Default%20Study/datasets/regular/%20',
      headers: {
        authorization: authHeader()
      }
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('Invalid formOid');
  });

  it('truncates snapshot ODM when requested via query flag', async () => {
    const app = buildServer();

    const res = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/studies/Default%20Study/datasets/regular?truncate=true',
      headers: {
        authorization: authHeader()
      }
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.trim().endsWith('</ODM>')).toBe(false);
  });

  it('omits closing ODM tag when streaming failure flag enabled', async () => {
    const app = buildServer();

    const currentRes = await app.inject({
      method: 'GET',
      url: '/harness/config',
      headers: {
        authorization: authHeader()
      }
    });

    expect(currentRes.statusCode).toBe(200);
    const currentConfig = currentRes.json().config;

    const updateRes = await app.inject({
      method: 'PUT',
      url: '/harness/config',
      headers: {
        authorization: authHeader(),
        'content-type': 'application/json'
      },
      payload: {
        applyMode: 'apply',
        config: {
          ...currentConfig,
          forceClinicalViewStreamFailure: true
        }
      }
    });

    expect(updateRes.statusCode).toBe(200);

    const res = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/studies/Default%20Study/datasets/regular',
      headers: {
        authorization: authHeader()
      }
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.trim().endsWith('</ODM>')).toBe(false);
  });

  it('rejects invalid truncate query value', async () => {
    const app = buildServer();

    const res = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/studies/Default%20Study/datasets/regular?truncate=maybe',
      headers: {
        authorization: authHeader()
      }
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('truncate must be a boolean value');
  });

  it('supports raw datasets with start and decode query options', async () => {
    const app = buildServer();
    await freezeStudyDay(app, 2.5);
    const startIso = await resolveStartIso(app, 1);

    const res = await app.inject({
      method: 'GET',
      url:
        `/RaveWebServices/studies/Default%20Study/datasets/raw?start=${encodeURIComponent(
          startIso
        )}&decodesuffix=_DEC&versionitem=VERSION`,
      headers: {
        authorization: authHeader()
      }
    });

    expect(res.statusCode).toBe(200);
    const body = res.body;
    const visits = extractVisitOids(body);
    expect(new Set(visits)).toEqual(new Set(['VISIT-002', 'VISIT-003']));
    expect(body).toContain('ItemOID="SYS_DEC"');
    expect(body).toMatch(
      /<ItemData ItemOID="SYS" Value="\d+ mmHg">\s*<MeasurementUnitRef MeasurementUnitOID="MU\.MMHG"\/>\s*<\/ItemData>/
    );
    expect(body).toMatch(/ItemOID="BRTHDTC"[^>]*Value="\d{2} [A-Z]{3} \d{4}"/);
    expect(body).toContain('ItemOID="VS.VERSION"');
  });

  it('supports rawsuffix on regular dataset endpoints', async () => {
    const app = buildServer();

    const res = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/studies/Default%20Study/datasets/regular?rawsuffix=_RAW',
      headers: {
        authorization: authHeader()
      }
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatch(/ItemOID="BRTHDTC_RAW"[^>]*Value="\d{2} [A-Z]{3} \d{4}"/);
  });

  it('rejects rawsuffix on raw dataset endpoints', async () => {
    const app = buildServer();

    const res = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/studies/Default%20Study/datasets/raw?rawsuffix=_RAW',
      headers: {
        authorization: authHeader()
      }
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('rawsuffix is only supported on regular dataset endpoints');
  });

  it('validates start query parameter', async () => {
    const app = buildServer();

    const res = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/studies/Default%20Study/datasets/raw?start=not-a-date',
      headers: {
        authorization: authHeader()
      }
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('start must be a valid ISO-8601 datetime');
  });

  it('requires authentication for raw datasets', async () => {
    const app = buildServer();

    const res = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/studies/Default%20Study/datasets/raw'
    });

    expect(res.statusCode).toBe(401);
  });

  it('serves versioned regular datasets with filtering', async () => {
    const app = buildServer();
    await freezeStudyDay(app, 2.5);
    const startIso = await resolveStartIso(app, 1);

    const res = await app.inject({
      method: 'GET',
      url: `/RaveWebServices/studies/Default%20Study/versions/V1/datasets/regular?start=${encodeURIComponent(startIso)}`,
      headers: {
        authorization: authHeader()
      }
    });

    expect(res.statusCode).toBe(200);
    const visits = extractVisitOids(res.body);
    expect(new Set(visits)).toEqual(new Set(['VISIT-002', 'VISIT-003']));
  });

  it('serves versioned raw datasets with query options', async () => {
    const app = buildServer();
    await freezeStudyDay(app, 2.5);
    const startIso = await resolveStartIso(app, 1);

    const res = await app.inject({
      method: 'GET',
      url:
        `/RaveWebServices/studies/Default%20Study/versions/V2/datasets/raw?start=${encodeURIComponent(
          startIso
        )}&decodesuffix=_DEC&versionitem=VERSION`,
      headers: {
        authorization: authHeader()
      }
    });

    expect(res.statusCode).toBe(200);
    const body = res.body;
    const visits = extractVisitOids(body);
    expect(new Set(visits)).toEqual(new Set(['VISIT-002', 'VISIT-003']));
    expect(body).toContain('ItemOID="SYS_DEC"');
    expect(body).toMatch(
      /<ItemData ItemOID="SYS" Value="\d+ mmHg">\s*<MeasurementUnitRef MeasurementUnitOID="MU\.MMHG"\/>\s*<\/ItemData>/
    );
    expect(body).toContain('ItemOID="VS.VERSION"');
  });

  it('filters versioned dataset by subject', async () => {
    const app = buildServer();
    await freezeStudyDay(app, 2.5);

    const res = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/studies/Default%20Study/versions/V3/subjects/100002/datasets/regular',
      headers: {
        authorization: authHeader()
      }
    });

    expect(res.statusCode).toBe(200);
    const subjectKeys = Array.from(res.body.matchAll(/SubjectKey="([^"]+)"/g)).map(match => match[1]);
    expect(new Set(subjectKeys)).toEqual(new Set(['100002']));
  });

  it('requires authentication for versioned datasets', async () => {
    const app = buildServer();

    const res = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/studies/Default%20Study/versions/V4/datasets/regular'
    });

    expect(res.statusCode).toBe(401);
  });

  it('rejects invalid version ids', async () => {
    const app = buildServer();

    const res = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/studies/Default%20Study/versions/%20/datasets/regular',
      headers: {
        authorization: authHeader()
      }
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('Invalid versionId');
  });

  it('supports rawsuffix on versioned regular dataset endpoints', async () => {
    const app = buildServer();

    const res = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/studies/Default%20Study/versions/V5/datasets/regular?rawsuffix=_RAW',
      headers: {
        authorization: authHeader()
      }
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatch(/ItemOID="BRTHDTC_RAW"/);
  });

  it('returns 404 when versioned subject is missing', async () => {
    const app = buildServer();

    const res = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/studies/Default%20Study/versions/V6/subjects/999999/datasets/regular',
      headers: {
        authorization: authHeader()
      }
    });

    expect(res.statusCode).toBe(404);
  });
});
