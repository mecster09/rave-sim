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

async function freezeStudyDay(app: ReturnType<typeof buildServer>, day = 2.5) {
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

function extractStatuses(xml: string) {
  return Array.from(xml.matchAll(/mdsol:SubjectStatus="([^"]+)"/g)).map(match => match[1]);
}

function extractSubjectKeys(xml: string) {
  return Array.from(xml.matchAll(/SubjectKey="([^"]+)"/g)).map(match => match[1]);
}

describe('Subjects listing endpoint', () => {
  it('requires authentication', async () => {
    const app = buildServer();

    const res = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/studies/Default%20Study/Subjects'
    });

    expect(res.statusCode).toBe(401);
  });

  it('returns active subjects by default', async () => {
    const app = buildServer();
    await freezeStudyDay(app);

    const res = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/studies/Default%20Study/Subjects',
      headers: {
        authorization: authHeader()
      }
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/xml');
    const keys = extractSubjectKeys(res.body);
    expect(keys.length).toBeGreaterThan(0);
    expect(keys.every(key => /^\d+$/.test(key))).toBe(true);
    const statuses = extractStatuses(res.body);
    expect(new Set(statuses)).toEqual(new Set(['Active']));
  });

  it('includes inactive subjects when requested', async () => {
    const app = buildServer();
    await freezeStudyDay(app);

    const res = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/studies/Default%20Study/Subjects?include=inactive',
      headers: {
        authorization: authHeader()
      }
    });

    expect(res.statusCode).toBe(200);
    const statuses = extractStatuses(res.body);
    expect(statuses).toContain('Inactive');
    expect(statuses).not.toContain('Deleted');
  });

  it('includes deleted subjects when include=inactiveAndDeleted', async () => {
    const app = buildServer();
    await freezeStudyDay(app);

    const res = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/studies/Default%20Study/Subjects?include=inactiveAndDeleted',
      headers: {
        authorization: authHeader()
      }
    });

    expect(res.statusCode).toBe(200);
    const statuses = extractStatuses(res.body);
    expect(statuses).toContain('Deleted');
  });

  it('allows status=all to override include filtering', async () => {
    const app = buildServer();
    await freezeStudyDay(app);

    const res = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/studies/Default%20Study/Subjects?include=inactive&status=all',
      headers: {
        authorization: authHeader()
      }
    });

    expect(res.statusCode).toBe(200);
    const statuses = new Set(extractStatuses(res.body));
    expect(statuses).toEqual(new Set(['Active', 'Inactive', 'Deleted']));
  });

  it('rejects invalid include parameter', async () => {
    const app = buildServer();

    const res = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/studies/Default%20Study/Subjects?include=unknown',
      headers: {
        authorization: authHeader()
      }
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('Invalid include parameter');
  });

  it('rejects invalid status parameter', async () => {
    const app = buildServer();

    const res = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/studies/Default%20Study/Subjects?status=inactive',
      headers: {
        authorization: authHeader()
      }
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('Invalid status parameter');
  });
});
