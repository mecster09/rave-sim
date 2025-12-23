import { FastifyInstance, FastifyReply } from 'fastify';
import { HarnessConfig } from '../services/config';
import { buildSnapshotODM } from '../services/odmBuilder';
import { buildClinicalViewSubjects } from '../services/clinicalViewBuilder';
import { SimulatorSnapshot, SimulatorState } from '../services/simulatorState';
import { computeGeneratedAt } from '../services/simulatorHelpers';
import { parseTruncateFlag } from '../utils/flags';

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

export interface ClinicalDatasetRouteDeps {
  getConfig(): HarnessConfig;
  getSimulatorState(): SimulatorState;
  createSimulatorState(config: HarnessConfig, seed: number): SimulatorState;
}

export function registerClinicalDatasetRoutes(app: FastifyInstance, deps: ClinicalDatasetRouteDeps) {
  app.get('/RaveWebServices/studies/:studyOid/datasets/regular', async (request, reply) => {
    const params = request.params as { studyOid?: unknown };
    const studyOid = typeof params.studyOid === 'string' ? params.studyOid : '';
    if (!studyOid) {
      return reply.code(400).send({ error: 'Invalid studyOid' });
    }

    return sendClinicalDataset(reply, deps, 'regular', studyOid, {}, request.query as Record<string, unknown>);
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

    return sendClinicalDataset(
      reply,
      deps,
      'regular',
      studyOid,
      { formOid },
      request.query as Record<string, unknown>
    );
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

    return sendClinicalDataset(
      reply,
      deps,
      'regular',
      studyOid,
      { subjectKey: numericSubjectKey },
      request.query as Record<string, unknown>
    );
  });

  app.get('/RaveWebServices/studies/:studyOid/datasets/raw', async (request, reply) => {
    const params = request.params as { studyOid?: unknown };
    const studyOid = typeof params.studyOid === 'string' ? params.studyOid : '';
    if (!studyOid) {
      return reply.code(400).send({ error: 'Invalid studyOid' });
    }

    return sendClinicalDataset(reply, deps, 'raw', studyOid, {}, request.query as Record<string, unknown>);
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

    return sendClinicalDataset(
      reply,
      deps,
      'raw',
      studyOid,
      { formOid },
      request.query as Record<string, unknown>
    );
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

    return sendClinicalDataset(
      reply,
      deps,
      'raw',
      studyOid,
      { subjectKey: numericSubjectKey },
      request.query as Record<string, unknown>
    );
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
      deps,
      'regular',
      studyOid,
      {},
      request.query as Record<string, unknown>,
      { versionId }
    );
  });

  app.get(
    '/RaveWebServices/studies/:studyOid/versions/:versionId/datasets/regular/:formOid',
    async (request, reply) => {
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
        deps,
        'regular',
        studyOid,
        { formOid },
        request.query as Record<string, unknown>,
        { versionId }
      );
    }
  );

  app.get(
    '/RaveWebServices/studies/:studyOid/versions/:versionId/subjects/:subjectKey/datasets/regular',
    async (request, reply) => {
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
        deps,
        'regular',
        studyOid,
        { subjectKey: numericSubjectKey },
        request.query as Record<string, unknown>,
        { versionId }
      );
    }
  );

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
      deps,
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
      deps,
      'raw',
      studyOid,
      { formOid },
      request.query as Record<string, unknown>,
      { versionId }
    );
  });

  app.get(
    '/RaveWebServices/studies/:studyOid/versions/:versionId/subjects/:subjectKey/datasets/raw',
    async (request, reply) => {
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
        deps,
        'raw',
        studyOid,
        { subjectKey: numericSubjectKey },
        request.query as Record<string, unknown>,
        { versionId }
      );
    }
  );
}

async function sendClinicalDataset(
  reply: FastifyReply,
  deps: ClinicalDatasetRouteDeps,
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

  const simulatorState = deps.getSimulatorState();
  const { generatedAt, simClock } = computeGeneratedAt(simulatorState);
  const startStudyDay = computeStartStudyDay(
    parseResult.value.startTimeMs,
    simClock.simStartWallClock,
    simClock.simSpeedMinutesPerDay
  );

  const snapshot = resolveClinicalDatasetSnapshot(options.versionId, simClock, simulatorState, deps);
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

  const config = deps.getConfig();
  const forcedStreamFailure = datasetType === 'regular' && config.forceClinicalViewStreamFailure;
  const shouldTruncate = config.truncateOdm || parseResult.value.truncateRequested || forcedStreamFailure;

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

function resolveClinicalDatasetSnapshot(
  versionId: string | undefined,
  simClock: {
    simCurrentStudyDay: number;
  },
  simulatorState: SimulatorState,
  deps: ClinicalDatasetRouteDeps
): SimulatorSnapshot {
  if (!versionId) {
    return simulatorState.getSnapshot();
  }

  const seed = computeVersionSeed(versionId);
  const versionState = deps.createSimulatorState(deps.getConfig(), seed);
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

function normalizeOptionalString(
  raw: unknown,
  label: string
): { ok: true; value?: string } | QueryParseError {
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
