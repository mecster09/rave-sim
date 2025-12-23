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

async function createTempDir(prefix: string): Promise<string> {
  if (tempDir) {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `${prefix}-`));
  return tempDir;
}

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

    const workingDir = await createTempDir('golden-regression');
    const manifestPath = path.join(workingDir, 'manifest.json');

    await generateGoldenPayloads({
      config: {
        harnessConfig: resolvedConfig.harnessConfig,
        simStudyDay: resolvedConfig.simStudyDay,
        freeze: resolvedConfig.freeze,
        scenarios: [targetScenario!]
      },
      outputDir: workingDir,
      manifestPath,
      authUser: AUTH_USER,
      authPass: AUTH_PASS
    });

    const generatedPath = path.join(workingDir, 'clinical-view', 'regular-dataset.xml');
    const goldenPath = path.resolve('golden-payloads/default/clinical-view/regular-dataset.xml');

    const [generated, golden] = await Promise.all([
      fs.readFile(generatedPath),
      fs.readFile(goldenPath)
    ]);

    expect(generated.equals(golden)).toBe(true);
  });

  it('replays raw dataset scenario into JSON deterministically', async () => {
    const configPath = path.resolve('golden-scenarios/default/config.json');
    const configDefinition = JSON.parse(await fs.readFile(configPath, 'utf8')) as GoldenConfigDefinition;
    const resolvedConfig = resolveGoldenConfig(configDefinition);

    const targetScenario = resolvedConfig.scenarios.find(
      scenario => scenario.family === 'datasets' && scenario.name === 'raw-options'
    );
    expect(targetScenario).toBeDefined();

    const workingDir = await createTempDir('golden-regression');
    const manifestPath = path.join(workingDir, 'manifest.json');

    await generateGoldenPayloads({
      config: {
        harnessConfig: resolvedConfig.harnessConfig,
        simStudyDay: resolvedConfig.simStudyDay,
        freeze: resolvedConfig.freeze,
        scenarios: [targetScenario!]
      },
      outputDir: workingDir,
      manifestPath,
      authUser: AUTH_USER,
      authPass: AUTH_PASS
    });

    const generatedPath = path.join(workingDir, 'datasets', 'raw-options.json');
    const goldenPath = path.resolve('golden-payloads/default/datasets/raw-options.json');

    const [generated, golden] = await Promise.all([
      fs.readFile(generatedPath),
      fs.readFile(goldenPath)
    ]);

    expect(generated.equals(golden)).toBe(true);
  });

  it('replays high subject volume subject scenario deterministically', async () => {
    const configPath = path.resolve('golden-scenarios/high-subject-volume/config.json');
    const configDefinition = JSON.parse(await fs.readFile(configPath, 'utf8')) as GoldenConfigDefinition;
    const resolvedConfig = resolveGoldenConfig(configDefinition);

    const targetScenario = resolvedConfig.scenarios.find(
      scenario => scenario.family === 'subjects' && scenario.name === 'all-status'
    );
    expect(targetScenario).toBeDefined();

    const workingDir = await createTempDir('golden-regression');
    const manifestPath = path.join(workingDir, 'manifest.json');

    await generateGoldenPayloads({
      config: {
        harnessConfig: resolvedConfig.harnessConfig,
        simStudyDay: resolvedConfig.simStudyDay,
        freeze: resolvedConfig.freeze,
        scenarios: [targetScenario!]
      },
      outputDir: workingDir,
      manifestPath,
      authUser: AUTH_USER,
      authPass: AUTH_PASS
    });

    const generatedPath = path.join(workingDir, 'subjects', 'all-status.xml');
    const goldenPath = path.resolve('golden-payloads/high-subject-volume/subjects/all-status.xml');

    const [generated, golden] = await Promise.all([
      fs.readFile(generatedPath),
      fs.readFile(goldenPath)
    ]);

    expect(generated.equals(golden)).toBe(true);
  });

  it('replays high visit volume dataset scenario deterministically', async () => {
    const configPath = path.resolve('golden-scenarios/high-visit-volume/config.json');
    const configDefinition = JSON.parse(await fs.readFile(configPath, 'utf8')) as GoldenConfigDefinition;
    const resolvedConfig = resolveGoldenConfig(configDefinition);

    const targetScenario = resolvedConfig.scenarios.find(
      scenario => scenario.family === 'datasets' && scenario.name === 'high-visit-snapshot'
    );
    expect(targetScenario).toBeDefined();

    const workingDir = await createTempDir('golden-regression');
    const manifestPath = path.join(workingDir, 'manifest.json');

    await generateGoldenPayloads({
      config: {
        harnessConfig: resolvedConfig.harnessConfig,
        simStudyDay: resolvedConfig.simStudyDay,
        freeze: resolvedConfig.freeze,
        scenarios: [targetScenario!]
      },
      outputDir: workingDir,
      manifestPath,
      authUser: AUTH_USER,
      authPass: AUTH_PASS
    });

    const generatedPath = path.join(workingDir, 'datasets', 'high-visit-snapshot.xml');
    const goldenPath = path.resolve('golden-payloads/high-visit-volume/datasets/high-visit-snapshot.xml');

    const [generated, golden] = await Promise.all([
      fs.readFile(generatedPath),
      fs.readFile(goldenPath)
    ]);

    expect(generated.equals(golden)).toBe(true);
  });

  it('replays high form data dataset scenario deterministically', async () => {
    const configPath = path.resolve('golden-scenarios/high-form-data/config.json');
    const configDefinition = JSON.parse(await fs.readFile(configPath, 'utf8')) as GoldenConfigDefinition;
    const resolvedConfig = resolveGoldenConfig(configDefinition);

    const targetScenario = resolvedConfig.scenarios.find(
      scenario => scenario.family === 'datasets' && scenario.name === 'high-form-snapshot'
    );
    expect(targetScenario).toBeDefined();

    const workingDir = await createTempDir('golden-regression');
    const manifestPath = path.join(workingDir, 'manifest.json');

    await generateGoldenPayloads({
      config: {
        harnessConfig: resolvedConfig.harnessConfig,
        simStudyDay: resolvedConfig.simStudyDay,
        freeze: resolvedConfig.freeze,
        scenarios: [targetScenario!]
      },
      outputDir: workingDir,
      manifestPath,
      authUser: AUTH_USER,
      authPass: AUTH_PASS
    });

    const generatedPath = path.join(workingDir, 'datasets', 'high-form-snapshot.xml');
    const goldenPath = path.resolve('golden-payloads/high-form-data/datasets/high-form-snapshot.xml');

    const [generated, golden] = await Promise.all([
      fs.readFile(generatedPath),
      fs.readFile(goldenPath)
    ]);

    expect(generated.equals(golden)).toBe(true);
  });
});
