import Fastify from 'fastify';
import { URL } from 'node:url';
import basicAuthPlugin from './plugins/basicAuth';
import { DEFAULT_RANDOM_SEED, HarnessConfig, validateConfig } from './services/config';
import { SimulatorSnapshot, SimulatorState, SubjectStatus } from './services/simulatorState';
import { buildSnapshotODM, buildTransactionalODM, buildOdmError } from './services/odmBuilder';
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
  truncateOdm: false,
  forceClinicalViewStreamFailure: false
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

  type ClinicalDatasetType = 'regular' | 'raw';
  const VERSION_ID_REGEX = /^[A-Za-z0-9._-]+$/;

  interface ParsedClinicalDatasetQuery {
    truncateRequested: boolean;
    startTimeMs?: number;
    versionItem?: string;
    decodeSuffix?: string;
    rawSuffix?: string;
  }

  interface QueryParseResult {
    ok: true;
    value: ParsedClinicalDatasetQuery;
  }

  interface QueryParseError {
    ok: false;
    statusCode: number;
    message: string;
  }

  function normalizeOptionalString(raw: unknown, label: string): { ok: true; value?: string } | QueryParseError {
    if (typeof raw === 'undefined') {
      return { ok: true };
    }
    if (typeof raw !== 'string') {
      return { ok: false, statusCode: 400, message: `${label} must be a string` };
    }
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      return { ok: false, statusCode: 400, message: `${label} must be a non-empty string` };
    }
    return { ok: true, value: trimmed };
  }

  function parseClinicalDatasetQuery(
    query: Record<string, unknown>,
    datasetType: ClinicalDatasetType
  ): QueryParseResult | QueryParseError {
    const truncateFlag = parseTruncateFlag(query.truncate);
    if (!truncateFlag.valid) {
      return { ok: false, statusCode: 400, message: 'truncate must be a boolean value' };
    }

    const startResult = normalizeOptionalString(query.start, 'start');
    if (!startResult.ok) {
      return startResult;
    }
    let startTimeMs: number | undefined;
    if (startResult.value) {
      const parsed = Date.parse(startResult.value);
      if (Number.isNaN(parsed)) {
        return { ok: false, statusCode: 400, message: 'start must be a valid ISO-8601 datetime' };
      }
      startTimeMs = parsed;
    }

    const versionResult = normalizeOptionalString(query.versionitem, 'versionitem');
    if (!versionResult.ok) {
      return versionResult;
    }

    const decodeResult = normalizeOptionalString(query.decodesuffix, 'decodesuffix');
    if (!decodeResult.ok) {
      return decodeResult;
    }

    const rawResult = normalizeOptionalString(query.rawsuffix, 'rawsuffix');
    if (!rawResult.ok) {
      return rawResult;
    }

    if (datasetType === 'regular' && rawResult.value) {
      return { ok: false, statusCode: 400, message: 'rawsuffix is only supported on raw dataset endpoints' };
    }

    return {
      ok: true,
      value: {
        truncateRequested: truncateFlag.requested,
        startTimeMs,
        versionItem: versionResult.value,
        decodeSuffix: decodeResult.value,
        rawSuffix: rawResult.value
      }
    };
  }

  function computeStartStudyDay(
    startTimeMs: number | undefined,
    simStartWallClock: number,
    simSpeedMinutesPerDay: number
  ): number | undefined {
    if (typeof startTimeMs === 'undefined') {
      return undefined;
    }
    const minutes = (startTimeMs - simStartWallClock) / 60000;
    return minutes / simSpeedMinutesPerDay;
  }

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

  async function sendClinicalDataset(
    reply: import('fastify').FastifyReply,
    datasetType: ClinicalDatasetType,
    studyOid: string,
    params: { formOid?: string; subjectKey?: number },
    query: Record<string, unknown>,
    options: { versionId?: string } = {}
  ) {
    const parseResult = parseClinicalDatasetQuery(query, datasetType);
    if (!parseResult.ok) {
      return reply.code(parseResult.statusCode).send({ error: parseResult.message });
    }

    const { simClock, generatedAt } = computeGeneratedAt();
    const startStudyDay = computeStartStudyDay(
      parseResult.value.startTimeMs,
      simClock.simStartWallClock,
      simClock.simSpeedMinutesPerDay
    );

    const snapshot = resolveClinicalDatasetSnapshot(options.versionId, simClock);
    if (typeof params.subjectKey === 'number') {
      const found = snapshot.subjects.some(subject => subject.subjectKey === params.subjectKey);
      if (!found) {
        return reply.code(404).send({ error: 'Subject not found' });
      }
    }

    const rawSuffix = parseResult.value.rawSuffix ?? (datasetType === 'raw' ? '_RAW' : undefined);

    const subjects = buildClinicalViewSubjects(snapshot, {
      currentStudyDay: simClock.simCurrentStudyDay,
      formOid: params.formOid,
      subjectKey: params.subjectKey,
      startStudyDay,
      versionItem: parseResult.value.versionItem,
      decodeSuffix: parseResult.value.decodeSuffix,
      rawSuffix
    });

    const forcedStreamFailure =
      datasetType === 'regular' && currentConfig.forceClinicalViewStreamFailure;
    const shouldTruncate = currentConfig.truncateOdm || parseResult.value.truncateRequested || forcedStreamFailure;

    const xml = buildSnapshotODM({
      studyOid,
      metadataVersionOid: 'MDV.DEFAULT',
      generatedAt,
      subjects,
      truncate: shouldTruncate
    });

    reply.header('content-type', 'application/xml');
    return reply.send(xml);
  }

  function resolveClinicalDatasetSnapshot(versionId: string | undefined, simClock: {
    simCurrentStudyDay: number;
  }): SimulatorSnapshot {
    if (!versionId) {
      return simulatorState.getSnapshot();
    }

    const seed = computeVersionSeed(versionId);
    const versionState = createSimulatorState(currentConfig, seed);
    versionState.setSimDay(simClock.simCurrentStudyDay, simulatorState.isFrozen());
    return versionState.getSnapshot();
  }

  function computeVersionSeed(versionId: string): number {
    let hash = 0;
    for (let i = 0; i < versionId.length; i += 1) {
      hash = (hash * 33 + versionId.charCodeAt(i)) >>> 0;
    }
    return hash === 0 ? 1 : hash;
  }

  app.get('/RaveWebServices/studies/:studyOid/datasets/regular', async (request, reply) => {
    const params = request.params as { studyOid?: unknown };
    const studyOid = typeof params.studyOid === 'string' ? params.studyOid : '';
    if (!studyOid) {
      return reply.code(400).send({ error: 'Invalid studyOid' });
    }

    return sendClinicalDataset(reply, 'regular', studyOid, {}, request.query as Record<string, unknown>);
  });

  app.get('/RaveWebServices/studies/:studyOid/datasets/regular/:formOid', async (request, reply) => {
    const params = request.params as { studyOid?: unknown; formOid?: unknown };
    const studyOid = typeof params.studyOid === 'string' ? params.studyOid : '';
    const formOidRaw = typeof params.formOid === 'string' ? params.formOid : '';
    const formOid = formOidRaw.trim();

    if (!studyOid) {
      return reply.code(400).send({ error: 'Invalid studyOid' });
    }

    if (!formOid) {
      return reply.code(400).send({ error: 'Invalid formOid' });
    }

    return sendClinicalDataset(reply, 'regular', studyOid, { formOid }, request.query as Record<string, unknown>);
  });

  app.get('/RaveWebServices/studies/:studyOid/subjects/:subjectKey/datasets/regular', async (request, reply) => {
    const params = request.params as { studyOid?: unknown; subjectKey?: unknown };
    const studyOid = typeof params.studyOid === 'string' ? params.studyOid : '';
    const subjectKeyValue = typeof params.subjectKey === 'string' ? params.subjectKey : '';

    if (!studyOid) {
      return reply.code(400).send({ error: 'Invalid studyOid' });
    }

    const normalizedSubject = subjectKeyValue.trim();
    if (!normalizedSubject) {
      return reply.code(400).send({ error: 'Invalid subjectKey' });
    }

    const numericSubjectKey = Number(normalizedSubject);
    if (!Number.isInteger(numericSubjectKey) || Number.isNaN(numericSubjectKey) || numericSubjectKey <= 0) {
      return reply.code(400).send({ error: 'Invalid subjectKey' });
    }

    return sendClinicalDataset(reply, 'regular', studyOid, { subjectKey: numericSubjectKey }, request.query as Record<string, unknown>);
  });

  app.get('/RaveWebServices/studies/:studyOid/datasets/raw', async (request, reply) => {
    const params = request.params as { studyOid?: unknown };
    const studyOid = typeof params.studyOid === 'string' ? params.studyOid : '';
    if (!studyOid) {
      return reply.code(400).send({ error: 'Invalid studyOid' });
    }

    return sendClinicalDataset(reply, 'raw', studyOid, {}, request.query as Record<string, unknown>);
  });

  app.get('/RaveWebServices/studies/:studyOid/datasets/raw/:formOid', async (request, reply) => {
    const params = request.params as { studyOid?: unknown; formOid?: unknown };
    const studyOid = typeof params.studyOid === 'string' ? params.studyOid : '';
    const formOidRaw = typeof params.formOid === 'string' ? params.formOid : '';
    const formOid = formOidRaw.trim();

    if (!studyOid) {
      return reply.code(400).send({ error: 'Invalid studyOid' });
    }

    if (!formOid) {
      return reply.code(400).send({ error: 'Invalid formOid' });
    }

    return sendClinicalDataset(reply, 'raw', studyOid, { formOid }, request.query as Record<string, unknown>);
  });

  app.get('/RaveWebServices/studies/:studyOid/subjects/:subjectKey/datasets/raw', async (request, reply) => {
    const params = request.params as { studyOid?: unknown; subjectKey?: unknown };
    const studyOid = typeof params.studyOid === 'string' ? params.studyOid : '';
    const subjectKeyValue = typeof params.subjectKey === 'string' ? params.subjectKey : '';

    if (!studyOid) {
      return reply.code(400).send({ error: 'Invalid studyOid' });
    }

    const normalizedSubject = subjectKeyValue.trim();
    if (!normalizedSubject) {
      return reply.code(400).send({ error: 'Invalid subjectKey' });
    }

    const numericSubjectKey = Number(normalizedSubject);
    if (!Number.isInteger(numericSubjectKey) || Number.isNaN(numericSubjectKey) || numericSubjectKey <= 0) {
      return reply.code(400).send({ error: 'Invalid subjectKey' });
    }

    return sendClinicalDataset(reply, 'raw', studyOid, { subjectKey: numericSubjectKey }, request.query as Record<string, unknown>);
  });

  app.get('/RaveWebServices/studies/:studyOid/versions/:versionId/datasets/regular', async (request, reply) => {
    const params = request.params as { studyOid?: unknown; versionId?: unknown };
    const studyOid = typeof params.studyOid === 'string' ? params.studyOid : '';
    const versionIdRaw = typeof params.versionId === 'string' ? params.versionId : '';
    const versionId = versionIdRaw.trim();

    if (!studyOid) {
      return reply.code(400).send({ error: 'Invalid studyOid' });
    }

    if (!versionId || !VERSION_ID_REGEX.test(versionId)) {
      return reply.code(400).send({ error: 'Invalid versionId' });
    }

    return sendClinicalDataset(
      reply,
      'regular',
      studyOid,
      {},
      request.query as Record<string, unknown>,
      { versionId }
    );
  });

  app.get('/RaveWebServices/studies/:studyOid/versions/:versionId/datasets/regular/:formOid', async (request, reply) => {
    const params = request.params as { studyOid?: unknown; versionId?: unknown; formOid?: unknown };
    const studyOid = typeof params.studyOid === 'string' ? params.studyOid : '';
    const versionIdRaw = typeof params.versionId === 'string' ? params.versionId : '';
    const formOidRaw = typeof params.formOid === 'string' ? params.formOid : '';
    const versionId = versionIdRaw.trim();
    const formOid = formOidRaw.trim();

    if (!studyOid) {
      return reply.code(400).send({ error: 'Invalid studyOid' });
    }

    if (!versionId || !VERSION_ID_REGEX.test(versionId)) {
      return reply.code(400).send({ error: 'Invalid versionId' });
    }

    if (!formOid) {
      return reply.code(400).send({ error: 'Invalid formOid' });
    }

    return sendClinicalDataset(
      reply,
      'regular',
      studyOid,
      { formOid },
      request.query as Record<string, unknown>,
      { versionId }
    );
  });

  app.get('/RaveWebServices/studies/:studyOid/versions/:versionId/subjects/:subjectKey/datasets/regular', async (request, reply) => {
    const params = request.params as { studyOid?: unknown; versionId?: unknown; subjectKey?: unknown };
    const studyOid = typeof params.studyOid === 'string' ? params.studyOid : '';
    const versionIdRaw = typeof params.versionId === 'string' ? params.versionId : '';
    const subjectKeyValue = typeof params.subjectKey === 'string' ? params.subjectKey : '';
    const versionId = versionIdRaw.trim();

    if (!studyOid) {
      return reply.code(400).send({ error: 'Invalid studyOid' });
    }

    if (!versionId || !VERSION_ID_REGEX.test(versionId)) {
      return reply.code(400).send({ error: 'Invalid versionId' });
    }

    const normalizedSubject = subjectKeyValue.trim();
    if (!normalizedSubject) {
      return reply.code(400).send({ error: 'Invalid subjectKey' });
    }

    const numericSubjectKey = Number(normalizedSubject);
    if (!Number.isInteger(numericSubjectKey) || Number.isNaN(numericSubjectKey) || numericSubjectKey <= 0) {
      return reply.code(400).send({ error: 'Invalid subjectKey' });
    }

    return sendClinicalDataset(
      reply,
      'regular',
      studyOid,
      { subjectKey: numericSubjectKey },
      request.query as Record<string, unknown>,
      { versionId }
    );
  });

  app.get('/RaveWebServices/studies/:studyOid/versions/:versionId/datasets/raw', async (request, reply) => {
    const params = request.params as { studyOid?: unknown; versionId?: unknown };
    const studyOid = typeof params.studyOid === 'string' ? params.studyOid : '';
    const versionIdRaw = typeof params.versionId === 'string' ? params.versionId : '';
    const versionId = versionIdRaw.trim();

    if (!studyOid) {
      return reply.code(400).send({ error: 'Invalid studyOid' });
    }

    if (!versionId || !VERSION_ID_REGEX.test(versionId)) {
      return reply.code(400).send({ error: 'Invalid versionId' });
    }

    return sendClinicalDataset(
      reply,
      'raw',
      studyOid,
      {},
      request.query as Record<string, unknown>,
      { versionId }
    );
  });

  app.get('/RaveWebServices/studies/:studyOid/versions/:versionId/datasets/raw/:formOid', async (request, reply) => {
    const params = request.params as { studyOid?: unknown; versionId?: unknown; formOid?: unknown };
    const studyOid = typeof params.studyOid === 'string' ? params.studyOid : '';
    const versionIdRaw = typeof params.versionId === 'string' ? params.versionId : '';
    const formOidRaw = typeof params.formOid === 'string' ? params.formOid : '';
    const versionId = versionIdRaw.trim();
    const formOid = formOidRaw.trim();

    if (!studyOid) {
      return reply.code(400).send({ error: 'Invalid studyOid' });
    }

    if (!versionId || !VERSION_ID_REGEX.test(versionId)) {
      return reply.code(400).send({ error: 'Invalid versionId' });
    }

    if (!formOid) {
      return reply.code(400).send({ error: 'Invalid formOid' });
    }

    return sendClinicalDataset(
      reply,
      'raw',
      studyOid,
      { formOid },
      request.query as Record<string, unknown>,
      { versionId }
    );
  });

  app.get('/RaveWebServices/studies/:studyOid/versions/:versionId/subjects/:subjectKey/datasets/raw', async (request, reply) => {
    const params = request.params as { studyOid?: unknown; versionId?: unknown; subjectKey?: unknown };
    const studyOid = typeof params.studyOid === 'string' ? params.studyOid : '';
    const versionIdRaw = typeof params.versionId === 'string' ? params.versionId : '';
    const subjectKeyValue = typeof params.subjectKey === 'string' ? params.subjectKey : '';
    const versionId = versionIdRaw.trim();

    if (!studyOid) {
      return reply.code(400).send({ error: 'Invalid studyOid' });
    }

    if (!versionId || !VERSION_ID_REGEX.test(versionId)) {
      return reply.code(400).send({ error: 'Invalid versionId' });
    }

    const normalizedSubject = subjectKeyValue.trim();
    if (!normalizedSubject) {
      return reply.code(400).send({ error: 'Invalid subjectKey' });
    }

    const numericSubjectKey = Number(normalizedSubject);
    if (!Number.isInteger(numericSubjectKey) || Number.isNaN(numericSubjectKey) || numericSubjectKey <= 0) {
      return reply.code(400).send({ error: 'Invalid subjectKey' });
    }

    return sendClinicalDataset(
      reply,
      'raw',
      studyOid,
      { subjectKey: numericSubjectKey },
      request.query as Record<string, unknown>,
      { versionId }
    );
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
    const rawModeInput = typeof query.mode === 'string' ? query.mode.trim().toLowerCase() : 'default';
    const unicodeRaw = typeof query.unicode === 'string' ? query.unicode.trim().toLowerCase() : undefined;

    const perPage = typeof perPageRaw === 'number' ? perPageRaw : Number(perPageRaw ?? 50);
    if (!Number.isInteger(perPage) || perPage < 1 || perPage > 100) {
      return reply.code(400).send({ error: 'per_page must be an integer between 1 and 100' });
    }

    const MODE_ALIASES: Record<string, 'default' | 'enhanced' | 'all'> = {
      default: 'default',
      normal: 'default',
      enhanced: 'enhanced',
      all: 'all'
    };

    const mode = MODE_ALIASES[rawModeInput];
    if (!mode) {
      return reply.code(400).send({ error: 'Invalid mode parameter' });
    }

    const unicode = unicodeRaw === 'true';
    const truncateFlag = parseTruncateFlag(query.truncate);
    if (!truncateFlag.valid) {
      return reply.code(400).send({ error: 'truncate must be a boolean value' });
    }
    const shouldTruncate = currentConfig.truncateOdm || truncateFlag.requested;
    const { simClock, generatedAt } = computeGeneratedAt();
    const metadataVersionOid = 'MDV.DEFAULT';
    const backfillComplete = simulatorState.isAuditBackfillComplete(simClock.simCurrentStudyDay);

    if ((mode === 'enhanced' || mode === 'all') && !backfillComplete) {
      const errorXml = buildOdmError({
        studyOid,
        metadataVersionOid,
        code: 'BACKFILL_NOT_READY',
        message: 'Audit backfill is still in progress',
        generatedAt
      });
      reply.header('content-type', 'application/xml');
      return reply.code(503).send(errorXml);
    }

    const { auditRecords, nextId } = buildAuditPage(simulatorState, {
      studyOid,
      metadataVersionOid,
      unicode,
      mode,
      startId,
      pageSize: perPage,
      backfillComplete
    });

    const xml = buildTransactionalODM({
      studyOid,
      metadataVersionOid,
      entries: auditRecords,
      generatedAt,
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
