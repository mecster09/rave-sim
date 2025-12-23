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

describe('VersionFolders dataset', () => {
  it('requires authentication', async () => {
    const app = buildServer();

    const res = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/datasets/VersionFolders.odm?studyoid=Default%20Study'
    });

    expect(res.statusCode).toBe(401);
  });

  it('validates studyoid input', async () => {
    const app = buildServer();

    const res = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/datasets/VersionFolders.odm',
      headers: {
        authorization: authHeader()
      }
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('studyoid is required');
  });

  it('returns deterministic version folder metadata', async () => {
    const app = buildServer();

    const res = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/datasets/VersionFolders.odm?studyoid=Default%20Study',
      headers: {
        authorization: authHeader()
      }
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/xml');
    expect(res.body).toContain('<StudyEventRef StudyEventOID="VISIT-001"');
    expect(res.body).toContain('<StudyEventDef OID="VISIT-002"');
    expect(res.body.trim().endsWith('</ODM>')).toBe(true);
  });

  it('omits closing ODM tag when stream failure flag is enabled', async () => {
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
          forceVersionFoldersStreamFailure: true
        }
      }
    });

    expect(updateRes.statusCode).toBe(200);

    const res = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/datasets/VersionFolders.odm?studyoid=Default%20Study',
      headers: {
        authorization: authHeader()
      }
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.trim().endsWith('</ODM>')).toBe(false);

    await app.inject({
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
          forceVersionFoldersStreamFailure: false
        }
      }
    });
  });
});
