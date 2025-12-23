import { afterEach, describe, expect, it } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import {
  generateGoldenPayloads,
  resolveGoldenConfig,
  GoldenConfigDefinition,
  sha256Hex
} from '../../src/services/goldenGenerator';

const BASE_CONFIG: GoldenConfigDefinition = {
  harnessConfig: {
    studyName: 'Golden Study',
    siteCount: 1,
    subjectCount: 2,
    visitCountPerSubject: 2,
    formDataPointsPerVisit: 2,
    simSpeedMinutesPerDay: 60,
    resetOnStartup: false,
    randomSeed: 24680,
    truncateOdm: false,
    forceClinicalViewStreamFailure: false
  },
  simStudyDay: 1,
  freeze: true,
  scenarios: [
    {
      family: 'clinical-view',
      name: 'snapshot',
      request: {
        method: 'GET',
        url: '/RaveWebServices/studies/Golden%20Study/datasets/regular'
      }
    }
  ]
};

const createdPaths: string[] = [];

afterEach(async () => {
  await Promise.all(
    createdPaths.splice(0).map(async dir => {
      await fs.rm(dir, { recursive: true, force: true });
    })
  );
});

describe('goldenGenerator', () => {
  it('resolves config definitions and generates manifest with payloads', async () => {
    const resolved = resolveGoldenConfig(BASE_CONFIG);
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'golden-gen-'));
    createdPaths.push(tmpDir);
    const manifestPath = path.join(tmpDir, 'manifest.json');

    const manifest = await generateGoldenPayloads({
      config: resolved,
      outputDir: tmpDir,
      manifestPath,
      authUser: 'test-user',
      authPass: 'test-pass'
    });

    expect(manifest.scenarios).toHaveLength(1);
    const entry = manifest.scenarios[0];
    expect(entry.family).toBe('clinical-view');
    expect(entry.name).toBe('snapshot');

    const payloadPath = path.join(tmpDir, entry.file.replace(/\//g, path.sep));
    const payload = await fs.readFile(payloadPath, 'utf8');
    expect(payload.includes('<ODM')).toBe(true);

    const computed = sha256Hex(Buffer.from(payload));
    expect(entry.sha256).toBe(computed);

    const manifestDisk = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    expect(manifestDisk.scenarios[0].file).toBe(entry.file);
  });

  it('rejects unsafe scenario names', async () => {
    const badConfig: GoldenConfigDefinition = {
      ...BASE_CONFIG,
      scenarios: [
        {
          family: '../bad',
          name: 'ok',
          request: {
            method: 'GET',
            url: '/RaveWebServices/studies/Golden%20Study/datasets/regular'
          }
        }
      ]
    };

    const resolved = resolveGoldenConfig(badConfig);
    const tmpDir = path.join(os.tmpdir(), 'golden-gen-unsafe');

    await expect(
      generateGoldenPayloads({
        config: resolved,
        outputDir: tmpDir,
        manifestPath: path.join(tmpDir, 'manifest.json'),
        authUser: 'test-user',
        authPass: 'test-pass'
      })
    ).rejects.toThrow(/family must match/);
  });

  it('rejects invalid harness config', () => {
    const invalid: GoldenConfigDefinition = {
      harnessConfig: { studyName: '' },
      simStudyDay: 1,
      freeze: true,
      scenarios: BASE_CONFIG.scenarios
    };

    expect(() => resolveGoldenConfig(invalid)).toThrow(/Invalid harnessConfig/);
  });
});
