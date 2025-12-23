import path from 'node:path';
import { promises as fs } from 'node:fs';
import { FastifyInstance } from 'fastify';
import { HarnessConfig } from '../services/config';
import { SimulatorState } from '../services/simulatorState';
import { computeGeneratedAt } from '../services/simulatorHelpers';
import { buildStudyMetadataODM } from '../services/odmBuilder';

const GOLDEN_SCENARIO_HEADER = 'x-harness-scenario';
const GOLDEN_SCENARIO_VALUE = 'META-200-GOLDEN';
const GOLDEN_BASE_DIR = path.resolve('golden-payloads/default/metadata');

export interface MetadataRouteDeps {
  getConfig(): HarnessConfig;
  getSimulatorState(): SimulatorState;
}

export function registerMetadataRoutes(app: FastifyInstance, deps: MetadataRouteDeps) {
  app.get('/RaveWebServices/metadata/studies/:studyName/versions/:versionId', async (request, reply) => {
    const params = request.params as { studyName?: string; versionId?: string };
    const query = request.query as Record<string, unknown>;

    const studyName = params.studyName?.trim();
    const versionId = params.versionId?.trim();

    if (!studyName || !versionId) {
      return reply.code(400).send({ error: 'study-name and version-id are required' });
    }

    if (query && (query.labels !== undefined || query.namespace !== undefined)) {
      return reply.code(400).send({ error: 'Metadata labels and attributes are not supported by the harness' });
    }

    const config = deps.getConfig();
    if (studyName !== config.studyName) {
      return reply.code(404).send({ error: 'Study not found' });
    }

    const simulatorState = deps.getSimulatorState();
    const metadataVersion = simulatorState.findMetadataVersion(versionId);
    if (!metadataVersion) {
      return reply.code(404).send({ error: 'Metadata version not found' });
    }

    const scenarioHeader = request.headers[GOLDEN_SCENARIO_HEADER] as string | undefined;
    if (scenarioHeader && scenarioHeader.toUpperCase() === GOLDEN_SCENARIO_VALUE) {
      const goldenPath = path.join(GOLDEN_BASE_DIR, `${sanitizeSegment(studyName)}-${sanitizeSegment(versionId)}.xml`);
      try {
        const payload = await fs.readFile(goldenPath, 'utf8');
        reply.header('content-type', 'application/xml');
        return reply.send(payload);
      } catch {
        return reply.code(500).send({ error: 'Golden payload unavailable' });
      }
    }

    const { generatedAt } = computeGeneratedAt(simulatorState);
    const xml = buildStudyMetadataODM({
      studyOid: config.studyName,
      generatedAt,
      metadata: metadataVersion
    });

    reply.header('content-type', 'application/xml');
    return reply.send(xml);
  });
}

function sanitizeSegment(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized.length > 0 ? normalized : 'default';
}
