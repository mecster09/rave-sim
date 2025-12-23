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

describe('Harness control plane endpoints', () => {
  it('rejects requests without authentication', async () => {
    const app = buildServer();

    const res = await app.inject({
      method: 'GET',
      url: '/harness/config'
    });

    expect(res.statusCode).toBe(401);
  });

  it('rejects invalid config payloads', async () => {
    const app = buildServer();

    const res = await app.inject({
      method: 'PUT',
      url: '/harness/config',
      headers: {
        authorization: authHeader(),
        'content-type': 'application/json'
      },
      payload: {
        applyMode: 'applyAndReset',
        config: {
          studyName: '',
          siteCount: 0,
          subjectCount: 0,
          visitCountPerSubject: 0,
          formDataPointsPerVisit: 0,
          simSpeedMinutesPerDay: 10
        }
      }
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('Invalid config');
  });

  it('applies new config with reset and reflects in status', async () => {
    const app = buildServer();

    const newConfig = {
      studyName: 'Updated Study',
      siteCount: 3,
      subjectCount: 4,
      visitCountPerSubject: 2,
      formDataPointsPerVisit: 6,
      simSpeedMinutesPerDay: 90,
      resetOnStartup: true
    };

    const updateRes = await app.inject({
      method: 'PUT',
      url: '/harness/config',
      headers: {
        authorization: authHeader(),
        'content-type': 'application/json'
      },
      payload: {
        applyMode: 'applyAndReset',
        config: newConfig
      }
    });

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.json().config).toMatchObject(newConfig);

    const statusRes = await app.inject({
      method: 'GET',
      url: '/harness/status',
      headers: {
        authorization: authHeader()
      }
    });

    expect(statusRes.statusCode).toBe(200);
    const statusBody = statusRes.json();
    expect(statusBody.config).toMatchObject(newConfig);
    expect(statusBody.counts).toEqual({
      sites: newConfig.siteCount,
      subjects: newConfig.subjectCount,
      visits: newConfig.subjectCount * newConfig.visitCountPerSubject,
      forms: newConfig.subjectCount * newConfig.visitCountPerSubject * newConfig.formDataPointsPerVisit
    });
  });

  it('updates simulation speed independently', async () => {
    const app = buildServer();

    const speedRes = await app.inject({
      method: 'GET',
      url: '/harness/speed',
      headers: {
        authorization: authHeader()
      }
    });

    expect(speedRes.statusCode).toBe(200);
    expect(speedRes.json().simSpeedMinutesPerDay).toBe(60);

    const updateRes = await app.inject({
      method: 'PUT',
      url: '/harness/speed',
      headers: {
        authorization: authHeader(),
        'content-type': 'application/json'
      },
      payload: {
        simSpeedMinutesPerDay: 120
      }
    });

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.json().simSpeedMinutesPerDay).toBe(120);

    const statusRes = await app.inject({
      method: 'GET',
      url: '/harness/status',
      headers: {
        authorization: authHeader()
      }
    });

    expect(statusRes.statusCode).toBe(200);
    expect(statusRes.json().config.simSpeedMinutesPerDay).toBe(120);
  });

  it('returns 400 for invalid applyMode', async () => {
    const app = buildServer();

    const res = await app.inject({
      method: 'PUT',
      url: '/harness/config',
      headers: {
        authorization: authHeader(),
        'content-type': 'application/json'
      },
      payload: {
        applyMode: 'invalid',
        config: {
          studyName: 'Test',
          siteCount: 1,
          subjectCount: 1,
          visitCountPerSubject: 1,
          formDataPointsPerVisit: 1,
          simSpeedMinutesPerDay: 15,
          resetOnStartup: false
        }
      }
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('Invalid applyMode');
  });

  it('resets simulator state via endpoint', async () => {
    const app = buildServer();

    const resetRes = await app.inject({
      method: 'POST',
      url: '/harness/reset',
      headers: {
        authorization: authHeader()
      }
    });

    expect(resetRes.statusCode).toBe(200);
    expect(resetRes.json().status).toBe('reset');
    expect(resetRes.json().counts).toBeDefined();
  });
});
