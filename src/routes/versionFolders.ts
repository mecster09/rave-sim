import { FastifyInstance } from 'fastify';
import { HarnessConfig } from '../services/config';
import { buildVersionFoldersODM } from '../services/odmBuilder';
import { SimulatorState } from '../services/simulatorState';
import { computeGeneratedAt } from '../services/simulatorHelpers';

export interface VersionFoldersRouteDeps {
  getConfig(): HarnessConfig;
  getSimulatorState(): SimulatorState;
}

export function registerVersionFoldersRoutes(app: FastifyInstance, deps: VersionFoldersRouteDeps) {
  app.get('/RaveWebServices/datasets/VersionFolders.odm', async (request, reply) => {
    const query = request.query as { studyoid?: unknown };
    const studyOid = typeof query.studyoid === 'string' ? query.studyoid.trim() : '';

    if (!studyOid) {
      return reply.code(400).send({ error: 'studyoid is required' });
    }

    const simulatorState = deps.getSimulatorState();
    const { generatedAt } = computeGeneratedAt(simulatorState);
    const versions = simulatorState.getVersionFolders();

    if (versions.length === 0) {
      return reply.code(404).send({ error: 'Version folders unavailable' });
    }

    const xml = buildVersionFoldersODM({
      studyOid,
      generatedAt,
      versions,
      truncate: deps.getConfig().forceVersionFoldersStreamFailure
    });

    reply.header('content-type', 'application/xml');
    return reply.send(xml);
  });
}
