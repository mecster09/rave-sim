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

function extractAuditIds(xml: string) {
  return Array.from(xml.matchAll(/AuditRecordID="([^"]+)"/g)).map(match => match[1]);
}

describe('ClinicalAuditRecords dataset', () => {
  it('requires authentication', async () => {
    const app = buildServer();

    const res = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/datasets/ClinicalAuditRecords.odm?studyoid=Default%20Study'
    });

    expect(res.statusCode).toBe(401);
  });

  it('returns paginated transactional ODM with Link header', async () => {
    const app = buildServer();

    const first = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/datasets/ClinicalAuditRecords.odm?studyoid=Default%20Study&per_page=5',
      headers: {
        authorization: authHeader()
      }
    });

    expect(first.statusCode).toBe(200);
    expect(first.headers['content-type']).toContain('application/xml');
    const ids = extractAuditIds(first.body);
    expect(ids.length).toBe(5);
    expect(first.headers.link).toBeDefined();
    const nextLink = first.headers.link as string;
    const startMatch = nextLink.match(/startid=([^&>]+)/);
    expect(startMatch).not.toBeNull();
    const nextId = startMatch![1];

    const second = await app.inject({
      method: 'GET',
      url: `/RaveWebServices/datasets/ClinicalAuditRecords.odm?studyoid=Default%20Study&per_page=5&startid=${nextId}`,
      headers: {
        authorization: authHeader()
      }
    });

    const secondIds = extractAuditIds(second.body);
    expect(new Set(secondIds)).not.toEqual(new Set(ids));
  });

  it('validates per_page bounds', async () => {
    const app = buildServer();

    const res = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/datasets/ClinicalAuditRecords.odm?studyoid=Default%20Study&per_page=0',
      headers: {
        authorization: authHeader()
      }
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('per_page must be an integer between 1 and 100');
  });

  it('returns 204 when enhanced mode gated', async () => {
    const app = buildServer();

    const res = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/datasets/ClinicalAuditRecords.odm?studyoid=Default%20Study&mode=enhanced',
      headers: {
        authorization: authHeader()
      }
    });

    expect(res.statusCode).toBe(204);
  });

  it('preserves unicode when requested', async () => {
    const app = buildServer();

    const res = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/datasets/ClinicalAuditRecords.odm?studyoid=Default%20Study&per_page=1&unicode=true',
      headers: {
        authorization: authHeader()
      }
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('ユニコード');
  });
});
