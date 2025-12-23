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
});
