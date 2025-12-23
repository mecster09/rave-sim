import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import {
  generateGoldenPayloads,
  resolveGoldenConfig,
  GoldenConfigDefinition
} from '../../src/services/goldenGenerator';

const AUTH_USER = 'test-user';
const AUTH_PASS = 'test-pass';

let tempDir: string | null = null;

beforeAll(() => {
  process.env.BASIC_AUTH_USER = AUTH_USER;
  process.env.BASIC_AUTH_PASS = AUTH_PASS;
});

afterAll(async () => {
  delete process.env.BASIC_AUTH_USER;
  delete process.env.BASIC_AUTH_PASS;
  if (tempDir) {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

describe('golden payload regression', () => {
  it('replays clinical-view scenario and matches golden payload', async () => {
    const configPath = path.resolve('golden-scenarios/default/config.json');
    const configDefinition = JSON.parse(await fs.readFile(configPath, 'utf8')) as GoldenConfigDefinition;
    const resolvedConfig = resolveGoldenConfig(configDefinition);

    const targetScenario = resolvedConfig.scenarios.find(
      scenario => scenario.family === 'clinical-view' && scenario.name === 'regular-dataset'
    );
    expect(targetScenario).toBeDefined();

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'golden-regression-'));
    const manifestPath = path.join(tempDir, 'manifest.json');

    await generateGoldenPayloads({
      config: {
        harnessConfig: resolvedConfig.harnessConfig,
        simStudyDay: resolvedConfig.simStudyDay,
        freeze: resolvedConfig.freeze,
        scenarios: [targetScenario!]
      },
      outputDir: tempDir,
      manifestPath,
      authUser: AUTH_USER,
      authPass: AUTH_PASS
    });

    const generatedPath = path.join(tempDir, 'clinical-view', 'regular-dataset.xml');
    const goldenPath = path.resolve('golden-payloads/default/clinical-view/regular-dataset.xml');

    const [generated, golden] = await Promise.all([
      fs.readFile(generatedPath),
      fs.readFile(goldenPath)
    ]);

    expect(generated.equals(golden)).toBe(true);
  });
});
