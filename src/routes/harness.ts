import { FastifyInstance } from 'fastify';
import { HarnessConfig, ValidateConfigResult } from '../services/config';
import { SimulatorState } from '../services/simulatorState';
import { buildStatus, getTimeState } from '../services/simulatorHelpers';

export interface HarnessRouteDeps {
  getConfig(): HarnessConfig;
  setConfig(config: HarnessConfig): void;
  getSeed(): number;
  setSeed(seed: number): void;
  getSimulatorState(): SimulatorState;
  recreateState(): void;
  validateConfig(input: unknown): ValidateConfigResult;
}

export function registerHarnessRoutes(app: FastifyInstance, deps: HarnessRouteDeps) {
  app.get('/harness/config', async () => {
    return { config: deps.getConfig() };
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
    const result = deps.validateConfig(candidate);

    if (result.error) {
      return reply.code(400).send({ error: 'Invalid config', details: result.error });
    }

    deps.setConfig(result.value);
    deps.setSeed(result.value.randomSeed);

    if (applyMode === 'applyAndReset') {
      deps.recreateState();
    }

    return { config: deps.getConfig(), applyMode };
  });

  app.get('/harness/speed', async () => {
    return { simSpeedMinutesPerDay: deps.getConfig().simSpeedMinutesPerDay };
  });

  app.put('/harness/speed', async (request, reply) => {
    const body = (request.body ?? {}) as { simSpeedMinutesPerDay?: unknown };
    const newSpeed = body.simSpeedMinutesPerDay;

    if (typeof newSpeed !== 'number') {
      return reply.code(400).send({ error: 'simSpeedMinutesPerDay must be a number' });
    }

    const candidate = {
      ...deps.getConfig(),
      simSpeedMinutesPerDay: newSpeed
    } satisfies HarnessConfig;

    const result = deps.validateConfig(candidate);

    if (result.error) {
      return reply.code(400).send({ error: 'Invalid speed', details: result.error });
    }

    deps.setConfig(result.value);
    deps.getSimulatorState().updateSimSpeed(result.value.simSpeedMinutesPerDay);

    return { simSpeedMinutesPerDay: deps.getConfig().simSpeedMinutesPerDay };
  });

  app.post('/harness/reset', async () => {
    deps.recreateState();
    const status = buildStatus(deps.getSimulatorState());
    return {
      status: 'reset',
      counts: status.counts
    };
  });

  app.get('/harness/status', async () => {
    const status = buildStatus(deps.getSimulatorState());
    return {
      config: deps.getConfig(),
      simClock: status.simClock,
      freeze: status.freeze,
      counts: status.counts,
      availability: status.availability
    };
  });

  app.get('/harness/time', async () => {
    return getTimeState(deps.getSimulatorState());
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

    deps.getSimulatorState().setSimDay(simStudyDay, freeze);

    return getTimeState(deps.getSimulatorState());
  });
}
