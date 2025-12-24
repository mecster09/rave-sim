import { FastifyInstance } from 'fastify';
import { HarnessConfig } from '../services/config';
import { buildOdmError, buildTransactionalODM } from '../services/odmBuilder';
import { buildAuditPage } from '../services/auditLog';
import { SimulatorState } from '../services/simulatorState';
import { computeGeneratedAt } from '../services/simulatorHelpers';
import { parseTruncateFlag } from '../utils/flags';
import { buildNextLink } from '../utils/url';

export interface AuditRecordsRouteDeps {
  getConfig(): HarnessConfig;
  getSimulatorState(): SimulatorState;
}

export function registerAuditRecordsRoutes(app: FastifyInstance, deps: AuditRecordsRouteDeps) {
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
    if (!Number.isInteger(perPage) || perPage < 1 || perPage > 10000) {
      return reply.code(400).send({ error: 'per_page must be an integer between 1 and 10000' });
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
    const simulatorState = deps.getSimulatorState();
    const metadataVersionOid = simulatorState.getPrimaryMetadataVersionOid();
    const shouldTruncate = deps.getConfig().truncateOdm || truncateFlag.requested;
    const { simClock, generatedAt } = computeGeneratedAt(simulatorState);
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
      const link = buildNextLink(request.raw.url ?? '', nextId, perPage);
      reply.header('Link', `<${link}>; rel="next"`);
    }

    reply.header('content-type', 'application/xml');
    return reply.send(xml);
  });
}
