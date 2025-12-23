import Fastify from 'fastify';
import basicAuthPlugin from './plugins/basicAuth';
import { HarnessConfig, validateConfig } from './services/config';
import { SimulatorSnapshot, SimulatorState } from './services/simulatorState';

const DEFAULT_CONFIG_INPUT = {
  studyName: 'Default Study',
  siteCount: 2,
  subjectCount: 10,
  visitCountPerSubject: 3,
  formDataPointsPerVisit: 5,
  simSpeedMinutesPerDay: 60,
  resetOnStartup: false
};

const DEFAULT_CONFIG_RESULT = validateConfig(DEFAULT_CONFIG_INPUT);

if (DEFAULT_CONFIG_RESULT.error) {
  throw new Error(`Invalid default config: ${DEFAULT_CONFIG_RESULT.error.join(', ')}`);
}

const DEFAULT_CONFIG = DEFAULT_CONFIG_RESULT.value;
const DEFAULT_SEED = 123456;

export function buildServer() {
  const app = Fastify({ logger: true });

  app.register(basicAuthPlugin);

  let currentConfig: HarnessConfig = { ...DEFAULT_CONFIG };
  let simulatorState = createSimulatorState(currentConfig);
  let cachedSnapshot: SimulatorSnapshot | null = null;

  const resetState = () => {
    simulatorState = createSimulatorState(currentConfig);
    cachedSnapshot = null;
  };

  const getSnapshot = (): SimulatorSnapshot => {
    if (!cachedSnapshot) {
      cachedSnapshot = simulatorState.getSnapshot();
    }
    return cachedSnapshot;
  };

  const getCounts = () => {
    const snapshot = getSnapshot();
    let visits = 0;
    let forms = 0;

    for (const subject of snapshot.subjects) {
      visits += subject.visits.length;
      for (const visit of subject.visits) {
        forms += visit.forms.length;
      }
    }

    return {
      sites: snapshot.sites.length,
      subjects: snapshot.subjects.length,
      visits,
      forms
    };
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

    if (applyMode === 'applyAndReset') {
      resetState();
      getSnapshot();
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

    return { simSpeedMinutesPerDay: currentConfig.simSpeedMinutesPerDay };
  });

  app.post('/harness/reset', async () => {
    resetState();
    getSnapshot();
    return {
      status: 'reset',
      counts: getCounts()
    };
  });

  app.get('/harness/status', async () => {
    return {
      config: currentConfig,
      simClock: { currentDay: 0 },
      counts: getCounts()
    };
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

function createSimulatorState(config: HarnessConfig) {
  return new SimulatorState({ ...config }, DEFAULT_SEED);
}
