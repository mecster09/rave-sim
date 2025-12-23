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
      resetOnStartup: true,
      randomSeed: 654321,
      truncateOdm: true,
      forceClinicalViewStreamFailure: false,
      forceVersionFoldersStreamFailure: false
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
    const totalVisits = newConfig.subjectCount * newConfig.visitCountPerSubject;
    expect(statusBody.counts).toEqual({
      sites: newConfig.siteCount,
      subjects: newConfig.subjectCount,
      visits: totalVisits,
      availableVisits: newConfig.subjectCount,
      unavailableVisits: totalVisits - newConfig.subjectCount,
      forms: totalVisits * newConfig.formDataPointsPerVisit
    });
    expect(typeof statusBody.simClock.simStartWallClock).toBe('number');
    expect(typeof statusBody.simClock.simCurrentStudyDay).toBe('number');
    expect(statusBody.simClock.simSpeedMinutesPerDay).toBe(newConfig.simSpeedMinutesPerDay);
    expect(Array.isArray(statusBody.availability)).toBe(true);
    expect(statusBody.availability.length).toBe(newConfig.subjectCount);
    const firstSubjectAvailability = statusBody.availability[0];
    expect(firstSubjectAvailability.visits[0].isAvailable).toBe(true);
    if (firstSubjectAvailability.visits.length > 1) {
      expect(firstSubjectAvailability.visits[1].isAvailable).toBe(false);
    }
    expect(statusBody.freeze).toBe(false);

    const datasetRes = await app.inject({
      method: 'GET',
      url: '/RaveWebServices/studies/Updated%20Study/datasets/regular',
      headers: {
        authorization: authHeader()
      }
    });

    expect(datasetRes.statusCode).toBe(200);
    expect(datasetRes.body.trim().endsWith('</ODM>')).toBe(false);
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
    const statusBody = statusRes.json();
    expect(statusBody.config.simSpeedMinutesPerDay).toBe(120);
    expect(statusBody.simClock.simSpeedMinutesPerDay).toBe(120);
    expect(statusBody.freeze).toBe(false);
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
          resetOnStartup: false,
          randomSeed: 42,
          truncateOdm: false,
          forceClinicalViewStreamFailure: false,
          forceVersionFoldersStreamFailure: false
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
    const counts = resetRes.json().counts;
    expect(counts).toMatchObject({
      sites: expect.any(Number),
      subjects: expect.any(Number),
      visits: expect.any(Number),
      availableVisits: expect.any(Number),
      unavailableVisits: expect.any(Number),
      forms: expect.any(Number)
    });
    expect(counts.availableVisits + counts.unavailableVisits).toBe(counts.visits);
  });

  it('allows access to time endpoints without auth', async () => {
    const app = buildServer();

    const getRes = await app.inject({
      method: 'GET',
      url: '/harness/time'
    });
    expect(getRes.statusCode).toBe(200);

    const putRes = await app.inject({
      method: 'PUT',
      url: '/harness/time',
      payload: { simStudyDay: 1, freeze: false },
      headers: {
        'content-type': 'application/json'
      }
    });
    expect(putRes.statusCode).toBe(200);
    expect(putRes.json().freeze).toBe(false);
  });

  it('validates time payload', async () => {
    const app = buildServer();

    const badDay = await app.inject({
      method: 'PUT',
      url: '/harness/time',
      headers: {
        authorization: authHeader(),
        'content-type': 'application/json'
      },
      payload: { simStudyDay: -1, freeze: true }
    });
    expect(badDay.statusCode).toBe(400);

    const badFreeze = await app.inject({
      method: 'PUT',
      url: '/harness/time',
      headers: {
        authorization: authHeader(),
        'content-type': 'application/json'
      },
      payload: { simStudyDay: 1, freeze: 'yes' }
    });
    expect(badFreeze.statusCode).toBe(400);
  });

  it('sets and freezes simulation day deterministically', async () => {
    const app = buildServer();

    const putRes = await app.inject({
      method: 'PUT',
      url: '/harness/time',
      headers: {
        authorization: authHeader(),
        'content-type': 'application/json'
      },
      payload: { simStudyDay: 2.5, freeze: true }
    });

    expect(putRes.statusCode).toBe(200);
    const putBody = putRes.json();
    expect(putBody.freeze).toBe(true);
    expect(putBody.simClock.simCurrentStudyDay).toBeCloseTo(2.5, 5);

    const timeRes = await app.inject({
      method: 'GET',
      url: '/harness/time',
      headers: {
        authorization: authHeader()
      }
    });

    expect(timeRes.statusCode).toBe(200);
    const timeBody = timeRes.json();
    expect(timeBody.freeze).toBe(true);
    expect(timeBody.simClock.simCurrentStudyDay).toBeCloseTo(2.5, 5);

    const statusRes = await app.inject({
      method: 'GET',
      url: '/harness/status',
      headers: {
        authorization: authHeader()
      }
    });

    expect(statusRes.statusCode).toBe(200);
    const statusBody = statusRes.json();
    expect(statusBody.freeze).toBe(true);
    expect(statusBody.simClock.simCurrentStudyDay).toBeCloseTo(2.5, 5);
  });
});
