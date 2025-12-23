#!/usr/bin/env ts-node
import path from 'node:path';
import { promises as fs } from 'node:fs';
import process from 'node:process';
import { generateGoldenPayloads, resolveGoldenConfig, GoldenConfigDefinition } from '../src/services/goldenGenerator';

async function main() {
  const args = process.argv.slice(2);
  let configPath = '';
  let outputDir = 'golden-payloads';
  let manifestName = 'manifest.json';
  let authUser = process.env.BASIC_AUTH_USER || 'test-user';
  let authPass = process.env.BASIC_AUTH_PASS || 'test-pass';

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--config' && i + 1 < args.length) {
      configPath = args[++i];
    } else if (arg === '--output' && i + 1 < args.length) {
      outputDir = args[++i];
    } else if (arg === '--manifest' && i + 1 < args.length) {
      manifestName = args[++i];
    } else if (arg === '--auth-user' && i + 1 < args.length) {
      authUser = args[++i];
    } else if (arg === '--auth-pass' && i + 1 < args.length) {
      authPass = args[++i];
    } else if (arg === '--help') {
      printUsage(0);
      return;
    }
  }

  if (!configPath) {
    printUsage(1);
    return;
  }

  const resolvedConfigPath = path.resolve(configPath);
  const configContent = await fs.readFile(resolvedConfigPath, 'utf8');
  const parsedDefinition = JSON.parse(configContent) as GoldenConfigDefinition;
  const resolvedConfig = resolveGoldenConfig(parsedDefinition);

  const manifestPath = path.resolve(path.join(outputDir, manifestName));

  await generateGoldenPayloads({
    config: resolvedConfig,
    outputDir,
    manifestPath,
    authUser,
    authPass
  });
}

function printUsage(exitCode: number) {
  const usage = `Usage: generateGoldenPayloads --config <path> [--output <dir>] [--manifest <filename>] [--auth-user <user>] [--auth-pass <pass>]

Options:
  --config       Path to scenario configuration JSON (required)
  --output       Output directory for golden payloads (default: golden-payloads)
  --manifest     Manifest filename within the output directory (default: manifest.json)
  --auth-user    Basic auth username (default: env BASIC_AUTH_USER or test-user)
  --auth-pass    Basic auth password (default: env BASIC_AUTH_PASS or test-pass)
  --help         Show this message
`;
  process.stdout.write(usage);
  process.exit(exitCode);
}

main().catch(error => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
