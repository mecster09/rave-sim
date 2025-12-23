import Fastify from 'fastify';
import { URL } from 'node:url';
import basicAuthPlugin from './plugins/basicAuth';
import { DEFAULT_RANDOM_SEED, HarnessConfig, validateConfig } from './services/config';
import { SimulatorSnapshot, SimulatorState, SubjectStatus } from './services/simulatorState';
import { buildSnapshotODM, buildTransactionalODM } from './services/odmBuilder';
import { buildClinicalViewSubjects } from './services/clinicalViewBuilder';
import { buildAuditPage } from './services/auditLog';

const DEFAULT_CONFIG_INPUT = {
  studyName: 'Default Study',
  siteCount: 2,
  subjectCount: 10,
  visitCountPerSubject: 3,
  formDataPointsPerVisit: 5,
  simSpeedMinutesPerDay: 60,
  resetOnStartup: false,
  randomSeed: DEFAULT_RANDOM_SEED,
  truncateOdm: false
};

const DEFAULT_CONFIG_RESULT = validateConfig(DEFAULT_CONFIG_INPUT);

if (DEFAULT_CONFIG_RESULT.error) {
  throw new Error(`Invalid default config: ${DEFAULT_CONFIG_RESULT.error.join(', ')}`);
}

const DEFAULT_CONFIG = DEFAULT_CONFIG_RESULT.value;
export function buildServer() {
  const app = Fastify({ logger: true });

  app.register(basicAuthPlugin);

  let currentConfig: HarnessConfig = { ...DEFAULT_CONFIG };
  let currentSeed = currentConfig.randomSeed;
  let simulatorState = createSimulatorState(currentConfig, currentSeed);

  const recreateState = () => {
    simulatorState = createSimulatorState(currentConfig, currentSeed);
    simulatorState.getSnapshot();
  };

  const computeCounts = (snapshot: SimulatorSnapshot, currentDay: number) => {
    let visits = 0;
    let forms = 0;
    let availableVisits = 0;

    for (const subject of snapshot.subjects) {
      visits += subject.visits.length;
      for (const visit of subject.visits) {
        for (const form of visit.forms) {
          forms += Object.keys(form.data).length;
        }
        if (simulatorState.isVisitAvailable(visit, currentDay)) {
          availableVisits += 1;
        }
      }
    }

    return {
      sites: snapshot.sites.length,
      subjects: snapshot.subjects.length,
      visits,
      availableVisits,
      unavailableVisits: visits - availableVisits,
      forms
    };
  };

  const getTimeState = () => {
    const simClock = simulatorState.getSimClock();
    return {
      simClock,
      freeze: simulatorState.isFrozen(),
      frozenDay: simulatorState.getFrozenDay()
    };
  };

  const computeGeneratedAt = () => {
    const simClock = simulatorState.getSimClock();
    const timestamp =
      simClock.simStartWallClock + simClock.simCurrentStudyDay * simClock.simSpeedMinutesPerDay * 60000;
    return {
      simClock,
      generatedAt: new Date(timestamp).toISOString()
    };
  };

  const buildNextLink = (request: import('fastify').FastifyRequest, nextId: string, perPage: number) => {
    const url = new URL(request.raw.url ?? '', 'http://local');
    url.searchParams.set('startid', nextId);
    url.searchParams.set('per_page', String(perPage));
    return url.pathname + (url.search ? url.search : '');
  };

  const buildStatus = () => {
    const { simClock } = getTimeState();
    const snapshot = simulatorState.getSnapshot();
    const counts = computeCounts(snapshot, simClock.simCurrentStudyDay);
    const availability = simulatorState.getSubjectAvailability(simClock.simCurrentStudyDay);
    return { simClock, counts, availability, freeze: simulatorState.isFrozen() };
  };

  const parseTruncateFlag = (raw: unknown) => {
    if (typeof raw === 'undefined') {
      return { valid: true, requested: false } as const;
    }

    if (typeof raw !== 'string') {
      return { valid: false, requested: false } as const;
    }

    const value = raw.trim().toLowerCase();

    if (value === 'true' || value === '1') {
      return { valid: true, requested: true } as const;
    }

    if (value === 'false' || value === '0') {
      return { valid: true, requested: false } as const;
    }

    return { valid: false, requested: false } as const;
  };

  app.get('/health', async () => {
    return { status: 'ok' };
  });

  app.get('/protected-ping', async () => {
    return { ok: true };
  });

  app.get('/harness/config', async () => {
    return { config: currentConfig };
  });

  app.put('/harness/config', async (request, reply) => {
    const body = (request.body ?? {}) as {
      applyMode?: unknown;
      config?: unknown;
    } & Record<string, unknown>;

    const applyMode = typeof body.applyMode === 'string' ? body.applyMode : 'apply';

    if (applyMode !== 'apply' && applyMode !== 'applyAndReset') {
      return reply.code(400).send({ error: 'Invalid applyMode' });
    }

    const { config: configFromBody, applyMode: _ignored, ...rest } = body;
    const candidate = configFromBody ?? rest;
    const result = validateConfig(candidate);

    if (result.error) {
      return reply.code(400).send({ error: 'Invalid config', details: result.error });
    }

    currentConfig = result.value;
    currentSeed = currentConfig.randomSeed;

    if (applyMode === 'applyAndReset') {
      recreateState();
    }

    return { config: currentConfig, applyMode };
  });

  app.get('/harness/speed', async () => {
    return { simSpeedMinutesPerDay: currentConfig.simSpeedMinutesPerDay };
  });

  app.put('/harness/speed', async (request, reply) => {
    const body = (request.body ?? {}) as { simSpeedMinutesPerDay?: unknown };
    const newSpeed = body.simSpeedMinutesPerDay;

    if (typeof newSpeed !== 'number') {
      return reply.code(400).send({ error: 'simSpeedMinutesPerDay must be a number' });
    }

    const candidate = {
      ...currentConfig,
      simSpeedMinutesPerDay: newSpeed
    };

    const result = validateConfig(candidate);

    if (result.error) {
      return reply.code(400).send({ error: 'Invalid speed', details: result.error });
    }

    currentConfig = result.value;

    simulatorState.updateSimSpeed(currentConfig.simSpeedMinutesPerDay);

    return { simSpeedMinutesPerDay: currentConfig.simSpeedMinutesPerDay };
  });

  app.post('/harness/reset', async () => {
    simulatorState = createSimulatorState(currentConfig, currentSeed);
    simulatorState.getSnapshot();
    const { counts } = buildStatus();
    return {
      status: 'reset',
      counts
    };
  });

  app.get('/harness/status', async () => {
    const { simClock, counts, availability, freeze } = buildStatus();
    return {
      config: currentConfig,
      simClock,
      freeze,
      counts,
      availability
    };
  });

  app.get('/harness/time', async () => {
    return getTimeState();
  });

  app.put('/harness/time', async (request, reply) => {
    const body = request.body;

    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return reply.code(400).send({ error: 'Invalid body' });
    }

    const { simStudyDay, freeze } = body as { simStudyDay?: unknown; freeze?: unknown };

    if (typeof simStudyDay !== 'number' || Number.isNaN(simStudyDay) || simStudyDay < 0) {
      return reply.code(400).send({ error: 'simStudyDay must be a non-negative number' });
    }

    if (typeof freeze !== 'boolean') {
      return reply.code(400).send({ error: 'freeze must be a boolean' });
    }

    simulatorState.setSimDay(simStudyDay, freeze);

    return getTimeState();
  });

  app.get('/RaveWebServices/studies/:studyOid/Subjects', async (request, reply) => {
    const params = request.params as { studyOid?: unknown };
    const query = request.query as { include?: unknown; status?: unknown; truncate?: unknown };

    const studyOid = typeof params.studyOid === 'string' ? params.studyOid : '';
    if (!studyOid) {
      return reply.code(400).send({ error: 'Invalid studyOid' });
    }

    const include = typeof query.include === 'string' ? query.include : undefined;
    const status = typeof query.status === 'string' ? query.status : undefined;
    const truncateFlag = parseTruncateFlag(query.truncate);

    if (!truncateFlag.valid) {
      return reply.code(400).send({ error: 'truncate must be a boolean value' });
    }

    const allowedIncludes = new Set(['inactive', 'inactiveAndDeleted']);
    if (include && !allowedIncludes.has(include)) {
      return reply.code(400).send({ error: 'Invalid include parameter' });
    }

    if (status && status !== 'all') {
      return reply.code(400).send({ error: 'Invalid status parameter' });
    }

    let allowedStatuses: SubjectStatus[] = ['Active'];
    if (status === 'all' || include === 'inactiveAndDeleted') {
      allowedStatuses = ['Active', 'Inactive', 'Deleted'];
    } else if (include === 'inactive') {
      allowedStatuses = ['Active', 'Inactive'];
    }

    const snapshot = simulatorState.getSnapshot();
    const filteredSubjects = snapshot.subjects
      .filter(subject => allowedStatuses.includes(subject.subjectStatus))
      .map(subject => ({
        subjectKey: String(subject.subjectKey),
        siteLocationOid: subject.siteLocationOid,
        subjectStatus: subject.subjectStatus,
        visits: subject.visits.map(visit => ({
          visitOid: visit.visitOid,
          forms: visit.forms.map(form => ({
            formOid: form.formOid,
            data: { ...form.data }
          }))
        }))
      }));

    const { simClock, generatedAt } = computeGeneratedAt();

    const shouldTruncate = currentConfig.truncateOdm || truncateFlag.requested;

    const xml = buildSnapshotODM({
      studyOid,
      metadataVersionOid: 'MDV.DEFAULT',
      generatedAt,
      subjects: filteredSubjects,
      truncate: shouldTruncate
    });

    reply.header('content-type', 'application/xml');
    return reply.send(xml);
  });

  app.get('/RaveWebServices/studies/:studyOid/datasets/regular', async (request, reply) => {
    const params = request.params as { studyOid?: unknown };
    const query = request.query as { truncate?: unknown };
    const studyOid = typeof params.studyOid === 'string' ? params.studyOid : '';

    if (!studyOid) {
      return reply.code(400).send({ error: 'Invalid studyOid' });
    }

    const truncateFlag = parseTruncateFlag(query.truncate);
    if (!truncateFlag.valid) {
      return reply.code(400).send({ error: 'truncate must be a boolean value' });
    }

    const snapshot = simulatorState.getSnapshot();
    const { simClock, generatedAt } = computeGeneratedAt();
    const subjects = buildClinicalViewSubjects(snapshot, {
      currentStudyDay: simClock.simCurrentStudyDay
    });

    const shouldTruncate = currentConfig.truncateOdm || truncateFlag.requested;

    const xml = buildSnapshotODM({
      studyOid,
      metadataVersionOid: 'MDV.DEFAULT',
      generatedAt,
      subjects,
      truncate: shouldTruncate
    });

    reply.header('content-type', 'application/xml');
    return reply.send(xml);
  });

  app.get('/RaveWebServices/studies/:studyOid/datasets/regular/:formOid', async (request, reply) => {
    const params = request.params as { studyOid?: unknown; formOid?: unknown };
    const query = request.query as { truncate?: unknown };
    const studyOid = typeof params.studyOid === 'string' ? params.studyOid : '';
    const formOidRaw = typeof params.formOid === 'string' ? params.formOid : '';
    const formOid = formOidRaw.trim();

    if (!studyOid) {
      return reply.code(400).send({ error: 'Invalid studyOid' });
    }

    if (!formOid) {
      return reply.code(400).send({ error: 'Invalid formOid' });
    }

    const truncateFlag = parseTruncateFlag(query.truncate);

    if (!truncateFlag.valid) {
      return reply.code(400).send({ error: 'truncate must be a boolean value' });
    }

    const snapshot = simulatorState.getSnapshot();
    const { simClock, generatedAt } = computeGeneratedAt();
    const subjects = buildClinicalViewSubjects(snapshot, {
      currentStudyDay: simClock.simCurrentStudyDay,
      formOid
    });

    const shouldTruncate = currentConfig.truncateOdm || truncateFlag.requested;

    const xml = buildSnapshotODM({
      studyOid,
      metadataVersionOid: 'MDV.DEFAULT',
      generatedAt,
      subjects,
      truncate: shouldTruncate
    });

    reply.header('content-type', 'application/xml');
    return reply.send(xml);
  });

  app.get('/RaveWebServices/studies/:studyOid/subjects/:subjectKey/datasets/regular', async (request, reply) => {
    const params = request.params as { studyOid?: unknown; subjectKey?: unknown };
    const query = request.query as { truncate?: unknown };
    const studyOid = typeof params.studyOid === 'string' ? params.studyOid : '';
    const subjectKeyValue = typeof params.subjectKey === 'string' ? params.subjectKey : '';

    if (!studyOid) {
      return reply.code(400).send({ error: 'Invalid studyOid' });
    }

    if (!subjectKeyValue || subjectKeyValue.trim().length === 0) {
      return reply.code(400).send({ error: 'Invalid subjectKey' });
    }

    const truncateFlag = parseTruncateFlag(query.truncate);

    if (!truncateFlag.valid) {
      return reply.code(400).send({ error: 'truncate must be a boolean value' });
    }

    const numericSubjectKey = Number(subjectKeyValue);
    if (!Number.isInteger(numericSubjectKey) || Number.isNaN(numericSubjectKey) || numericSubjectKey <= 0) {
      return reply.code(400).send({ error: 'Invalid subjectKey' });
    }

    const snapshot = simulatorState.getSnapshot();
    const subjectExists = snapshot.subjects.some(subject => subject.subjectKey === numericSubjectKey);

    if (!subjectExists) {
      return reply.code(404).send({ error: 'Subject not found' });
    }

    const { simClock, generatedAt } = computeGeneratedAt();
    const subjects = buildClinicalViewSubjects(snapshot, {
      currentStudyDay: simClock.simCurrentStudyDay,
      subjectKey: numericSubjectKey
    });

    const shouldTruncate = currentConfig.truncateOdm || truncateFlag.requested;

    const xml = buildSnapshotODM({
      studyOid,
      metadataVersionOid: 'MDV.DEFAULT',
      generatedAt,
      subjects,
      truncate: shouldTruncate
    });

    reply.header('content-type', 'application/xml');
    return reply.send(xml);
  });

  app.get('/RaveWebServices/datasets/ClinicalAuditRecords.odm', async (request, reply) => {
    const query = request.query as {
      studyoid?: unknown;
      startid?: unknown;
      per_page?: unknown;
      mode?: unknown;
      unicode?: unknown;
      truncate?: unknown;
    };

    const studyOid = typeof query.studyoid === 'string' ? query.studyoid.trim() : '';
    if (!studyOid) {
      return reply.code(400).send({ error: 'studyoid is required' });
    }

    const startId = typeof query.startid === 'string' ? query.startid.trim() : '';
    const perPageRaw = query.per_page;
    const modeRaw = typeof query.mode === 'string' ? query.mode.trim().toLowerCase() : 'normal';
    const unicodeRaw = typeof query.unicode === 'string' ? query.unicode.trim().toLowerCase() : undefined;

    const perPage = typeof perPageRaw === 'number' ? perPageRaw : Number(perPageRaw ?? 50);
    if (!Number.isInteger(perPage) || perPage < 1 || perPage > 100) {
      return reply.code(400).send({ error: 'per_page must be an integer between 1 and 100' });
    }

    const allowedModes = new Set(['normal', 'enhanced', 'all']);
    if (!allowedModes.has(modeRaw)) {
      return reply.code(400).send({ error: 'Invalid mode parameter' });
    }

    const unicode = unicodeRaw === 'true';
    const truncateFlag = parseTruncateFlag(query.truncate);
    if (!truncateFlag.valid) {
      return reply.code(400).send({ error: 'truncate must be a boolean value' });
    }
    const shouldTruncate = currentConfig.truncateOdm || truncateFlag.requested;
    const { simClock } = computeGeneratedAt();
    const metadataVersionOid = 'MDV.DEFAULT';

    const backfillComplete = modeRaw === 'all';

    const { auditRecords, nextId } = buildAuditPage(simulatorState, {
      studyOid,
      metadataVersionOid,
      unicode,
      mode: modeRaw as 'normal' | 'enhanced' | 'all',
      startId,
      pageSize: perPage,
      backfillComplete
    });

    if (modeRaw === 'enhanced' && !backfillComplete && auditRecords.length === 0) {
      return reply.code(204).send();
    }

    const xml = buildTransactionalODM({
      studyOid,
      metadataVersionOid,
      entries: auditRecords,
      truncate: shouldTruncate
    });

    if (nextId) {
      reply.header('Link', `<${buildNextLink(request, nextId, perPage)}>; rel="next"`);
    }

    reply.header('content-type', 'application/xml');
    return reply.send(xml);
  });

  return app;
}

/* c8 ignore start - runtime bootstrap */
if (require.main === module) {
  const app = buildServer();
  const port = Number(process.env.PORT) || 3000;
  app.listen({ port }, err => {
    if (err) {
      app.log.error(err);
      process.exit(1);
    }
  });
}
/* c8 ignore stop */

function createSimulatorState(config: HarnessConfig, seed: number) {
  return new SimulatorState({ ...config }, seed);
}
