import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import basicAuthPlugin from './plugins/basicAuth';
import { DEFAULT_RANDOM_SEED, HarnessConfig, validateConfig } from './services/config';
import { SimulatorState } from './services/simulatorState';
import { registerHealthRoutes } from './routes/health';
import { registerHarnessRoutes } from './routes/harness';
import { registerSubjectRoutes } from './routes/subjects';
import { registerClinicalDatasetRoutes } from './routes/clinicalDatasets';
import { registerVersionFoldersRoutes } from './routes/versionFolders';
import { registerAuditRecordsRoutes } from './routes/auditRecords';
import { registerMetadataRoutes } from './routes/metadata';
import { openApiSpec } from './docs/openapi';

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
  forceClinicalViewStreamFailure: false,
  forceVersionFoldersStreamFailure: false
};

const DEFAULT_CONFIG_RESULT = validateConfig(DEFAULT_CONFIG_INPUT);

if (DEFAULT_CONFIG_RESULT.error) {
  throw new Error(`Invalid default config: ${DEFAULT_CONFIG_RESULT.error.join(', ')}`);
}

const DEFAULT_CONFIG = DEFAULT_CONFIG_RESULT.value;

export function buildServer() {
  const app = Fastify({ logger: true });

  app.register(basicAuthPlugin);
  app.register(swagger, {
    openapi: openApiSpec
  });
  app.get('/docs', async (_request, reply) => {
    reply.header('content-type', 'text/html; charset=utf-8');
    return reply.send(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Swagger UI</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui">Swagger UI is loading...</div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.onload = () => {
        window.SwaggerUIBundle({
          url: '/swagger.json',
          dom_id: '#swagger-ui',
          docExpansion: 'list',
          presets: [window.SwaggerUIBundle.presets.apis],
          layout: 'BaseLayout'
        });
      };
    </script>
  </body>
</html>`);
  });

  app.get('/swagger.json', async (_request, reply) => {
    reply.header('content-type', 'application/json');
    return reply.send(openApiSpec);
  });

  let currentConfig: HarnessConfig = { ...DEFAULT_CONFIG };
  let currentSeed = currentConfig.randomSeed;
  let simulatorState = createSimulatorState(currentConfig, currentSeed);

  const getConfig = () => currentConfig;
  const setConfig = (config: HarnessConfig) => {
    currentConfig = { ...config };
  };
  const getSeed = () => currentSeed;
  const setSeed = (seed: number) => {
    currentSeed = seed;
  };
  const getSimulatorState = () => simulatorState;
  const recreateState = () => {
    simulatorState = createSimulatorState(currentConfig, currentSeed);
    simulatorState.getSnapshot();
  };
  const createState = (config: HarnessConfig, seed: number) => createSimulatorState(config, seed);

  registerHealthRoutes(app);
  registerHarnessRoutes(app, {
    getConfig,
    setConfig,
    getSeed,
    setSeed,
    getSimulatorState,
    recreateState,
    validateConfig
  });
  registerSubjectRoutes(app, {
    getConfig,
    getSimulatorState
  });
  registerClinicalDatasetRoutes(app, {
    getConfig,
    getSimulatorState,
    createSimulatorState: createState
  });
  registerVersionFoldersRoutes(app, {
    getConfig,
    getSimulatorState
  });
  registerAuditRecordsRoutes(app, {
    getConfig,
    getSimulatorState
  });
  registerMetadataRoutes(app, {
    getConfig,
    getSimulatorState
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
