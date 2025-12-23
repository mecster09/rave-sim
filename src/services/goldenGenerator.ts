import crypto from 'node:crypto';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { buildServer } from '../server';
import { HarnessConfig, validateConfig } from './config';
import { HTTPMethods } from 'fastify';
import type { FastifyInstance } from 'fastify';
import type { InjectOptions, Response as InjectResponse } from 'light-my-request';

export interface GoldenScenarioRequest {
  method?: string;
  url: string;
  headers?: Record<string, string>;
  payload?: unknown;
  expectedStatus?: number;
}

export interface GoldenScenarioDefinition {
  family: string;
  name: string;
  auth?: boolean;
  request: GoldenScenarioRequest;
}

export interface GoldenConfigDefinition {
  harnessConfig: unknown;
  simStudyDay: unknown;
  freeze: unknown;
  scenarios: unknown;
}

export interface ResolvedGoldenScenario {
  family: string;
  name: string;
  auth: boolean;
  request: {
    method: HTTPMethods;
    url: string;
    headers: Record<string, string>;
    payload?: ScenarioPayload;
    expectedStatus: number;
  };
}

type ScenarioPayload = string | Buffer | NodeJS.ReadableStream | Record<string, unknown> | unknown[];

export interface ResolvedGoldenConfig {
  harnessConfig: HarnessConfig;
  simStudyDay: number;
  freeze: boolean;
  scenarios: ResolvedGoldenScenario[];
}

export interface ManifestScenarioEntry {
  family: string;
  name: string;
  file: string;
  sha256: string;
  statusCode: number;
}

export interface ManifestDocument {
  generatedAt: string;
  scenarios: ManifestScenarioEntry[];
}

export interface GenerateGoldenOptions {
  config: ResolvedGoldenConfig;
  outputDir: string;
  manifestPath: string;
  authUser: string;
  authPass: string;
}

const SAFE_SEGMENT_REGEX = /^[A-Za-z0-9_-]+$/;

export function resolveGoldenConfig(definition: GoldenConfigDefinition): ResolvedGoldenConfig {
  const configResult = validateConfig(definition.harnessConfig);
  if (configResult.error) {
    throw new Error(`Invalid harnessConfig: ${configResult.error.join(', ')}`);
  }

  const harnessConfig: HarnessConfig = configResult.value;

  const simStudyDay = Number(definition.simStudyDay);
  if (!Number.isFinite(simStudyDay) || simStudyDay < 0) {
    throw new Error('simStudyDay must be a non-negative number');
  }

  if (typeof definition.freeze !== 'boolean') {
    throw new Error('freeze must be a boolean');
  }

  if (!Array.isArray(definition.scenarios) || definition.scenarios.length === 0) {
    throw new Error('scenarios must be a non-empty array');
  }

  const scenarios: ResolvedGoldenScenario[] = definition.scenarios.map((raw, index) => {
    if (typeof raw !== 'object' || raw === null) {
      throw new Error(`scenario[${index}] must be an object`);
    }
    const candidate = raw as GoldenScenarioDefinition;

    if (typeof candidate.family !== 'string' || candidate.family.trim().length === 0) {
      throw new Error(`scenario[${index}] family must be a non-empty string`);
    }
    if (typeof candidate.name !== 'string' || candidate.name.trim().length === 0) {
      throw new Error(`scenario[${index}] name must be a non-empty string`);
    }
    if (typeof candidate.request !== 'object' || candidate.request === null) {
      throw new Error(`scenario[${index}] request must be defined`);
    }
    if (typeof candidate.request.url !== 'string' || candidate.request.url.trim().length === 0) {
      throw new Error(`scenario[${index}] request.url must be a non-empty string`);
    }

    if (candidate.request.headers && typeof candidate.request.headers !== 'object') {
      throw new Error(`scenario[${index}] request.headers must be an object when provided`);
    }

    if (
      candidate.request.expectedStatus !== undefined &&
      (typeof candidate.request.expectedStatus !== 'number' || !Number.isInteger(candidate.request.expectedStatus))
    ) {
      throw new Error(`scenario[${index}] request.expectedStatus must be an integer when provided`);
    }

    const method = normalizeMethod(candidate.request.method, index);
    const expectedStatus =
      typeof candidate.request.expectedStatus === 'number' ? candidate.request.expectedStatus : 200;

    if (candidate.request.payload !== undefined && !isScenarioPayload(candidate.request.payload)) {
      throw new Error(`scenario[${index}] request.payload must be a string, object, array, buffer, or stream when provided`);
    }

    return {
      family: candidate.family.trim(),
      name: candidate.name.trim(),
      auth: candidate.auth === false ? false : true,
      request: {
        method,
        url: candidate.request.url,
        headers: { ...(candidate.request.headers ?? {}) },
        payload: candidate.request.payload as ScenarioPayload | undefined,
        expectedStatus
      }
    };
  });

  return {
    harnessConfig,
    simStudyDay,
    freeze: definition.freeze,
    scenarios
  };
}

export async function generateGoldenPayloads(options: GenerateGoldenOptions): Promise<ManifestDocument> {
  const { config, outputDir, manifestPath, authUser, authPass } = options;
  const normalizedOutput = path.resolve(outputDir);
  await fs.mkdir(normalizedOutput, { recursive: true });

  const previousUser = process.env.BASIC_AUTH_USER;
  const previousPass = process.env.BASIC_AUTH_PASS;
  process.env.BASIC_AUTH_USER = authUser;
  process.env.BASIC_AUTH_PASS = authPass;

  const originalNow = Date.now;
  Date.now = () => FIXED_NOW_EPOCH;

  const app = buildServer();

  const authHeaderValue = buildAuthHeader(authUser, authPass);
  const manifestEntries: ManifestScenarioEntry[] = [];

  try {
    await ensureSuccessful(
      performInject(app, {
        method: 'PUT',
        url: '/harness/config',
        headers: {
          authorization: authHeaderValue,
          'content-type': 'application/json'
        },
        payload: {
          applyMode: 'applyAndReset',
          config: config.harnessConfig
        }
      }),
      'Failed to apply harness config'
    );

    await ensureSuccessful(
      performInject(app, {
        method: 'POST',
        url: '/harness/reset',
        headers: {
          authorization: authHeaderValue
        }
      }),
      'Failed to reset harness'
    );

    await ensureSuccessful(
      performInject(app, {
        method: 'PUT',
        url: '/harness/time',
        headers: {
          'content-type': 'application/json'
        },
        payload: {
          simStudyDay: config.simStudyDay,
          freeze: config.freeze
        }
      }),
      'Failed to set harness time'
    );

    for (const scenario of config.scenarios) {
      const safeFamily = requireSafeSegment(scenario.family, 'family');
      const safeName = requireSafeSegment(scenario.name, 'name');

      const scenarioHeaders = { ...scenario.request.headers };
      if (scenario.auth) {
        scenarioHeaders.authorization = authHeaderValue;
      }

      if (!('accept' in scenarioHeaders)) {
        scenarioHeaders.accept = 'application/xml';
      }

      const response = await performInject(app, {
        method: scenario.request.method as InjectOptions['method'],
        url: scenario.request.url,
        headers: scenarioHeaders,
        payload: scenario.request.payload
      });

      if (response.statusCode !== scenario.request.expectedStatus) {
        throw new Error(
          `Scenario ${scenario.family}/${scenario.name} expected status ${scenario.request.expectedStatus} but received ${response.statusCode}`
        );
      }

      const buffer = Buffer.isBuffer(response.body) ? response.body : Buffer.from(response.body);
      const relativeFile = path.join(safeFamily, `${safeName}.xml`);
      const absoluteFile = path.join(normalizedOutput, relativeFile);
      await fs.mkdir(path.dirname(absoluteFile), { recursive: true });
      await fs.writeFile(absoluteFile, buffer);

      manifestEntries.push({
        family: scenario.family,
        name: scenario.name,
        file: toPosixPath(relativeFile),
        sha256: sha256Hex(buffer),
        statusCode: response.statusCode
      });
    }
  } finally {
    await app.close();
    Date.now = originalNow;
    if (previousUser === undefined) {
      delete process.env.BASIC_AUTH_USER;
    } else {
      process.env.BASIC_AUTH_USER = previousUser;
    }

    if (previousPass === undefined) {
      delete process.env.BASIC_AUTH_PASS;
    } else {
      process.env.BASIC_AUTH_PASS = previousPass;
    }
  }

  const sortedEntries = manifestEntries.sort((a, b) => {
    if (a.family === b.family) {
      return a.name.localeCompare(b.name);
    }
    return a.family.localeCompare(b.family);
  });

  const manifest: ManifestDocument = {
    generatedAt: new Date().toISOString(),
    scenarios: sortedEntries
  };

  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  return manifest;
}

export function sha256Hex(data: Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function buildAuthHeader(user: string, pass: string) {
  return `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
}

function requireSafeSegment(segment: string, label: string): string {
  if (!SAFE_SEGMENT_REGEX.test(segment)) {
    throw new Error(`${label} must match ${SAFE_SEGMENT_REGEX}`);
  }
  return segment;
}

function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

async function ensureSuccessful(responsePromise: PromiseLike<{ statusCode: number; body: unknown }>, message: string) {
  const response = await responsePromise;
  if (response.statusCode < 200 || response.statusCode >= 300) {
    const details = typeof response.body === 'string' ? response.body : JSON.stringify(response.body);
    throw new Error(`${message}: ${response.statusCode} ${details}`);
  }
}

function performInject(app: FastifyInstance, options: InjectOptions): Promise<InjectResponse> {
  return app.inject(options);
}

const ALLOWED_METHODS: readonly HTTPMethods[] = ['DELETE', 'GET', 'HEAD', 'PATCH', 'POST', 'PUT', 'OPTIONS'];
const FIXED_NOW_EPOCH = Date.UTC(2024, 0, 1, 0, 0, 0, 0);

function normalizeMethod(raw: string | undefined, index: number): HTTPMethods {
  if (raw === undefined || raw.trim().length === 0) {
    return 'GET';
  }

  const upper = raw.trim().toUpperCase();
  if ((ALLOWED_METHODS as readonly string[]).includes(upper)) {
    return upper as HTTPMethods;
  }

  throw new Error(`scenario[${index}] request.method must be a valid HTTP method`);
}

function isScenarioPayload(value: unknown): value is ScenarioPayload {
  if (value === null) {
    return false;
  }

  if (typeof value === 'string' || Buffer.isBuffer(value)) {
    return true;
  }

  if (Array.isArray(value)) {
    return true;
  }

  if (typeof value === 'object') {
    return true;
  }

  if (typeof value === 'function') {
    return false;
  }

  if (value && typeof (value as NodeJS.ReadableStream).pipe === 'function') {
    return true;
  }

  return false;
}
