# Rave Web Services Simulator

Rave-Sim is a Fastify-based simulator that reproduces a subset of the Rave Web Services API for deterministic functional testing, payload generation, and sandbox experimentation. The service ships with a configurable harness so scenarios can be seeded, frozen in time, and replayed with predictable outputs.

## Key Features

- **Deterministic Harness** – Control study composition (sites, subjects, visits, forms) and simulation time using the `/harness/*` endpoints.
- **Golden Payloads** – Generate reproducible XML datasets for regression testing, backed by manifests with hashes and response metadata.
- **Scenario Library** – Curated presets (default, partial enrollment, high-volume variants) that exercise performance and ordering edge cases.
- **Test Suite** – Comprehensive Vitest functional and unit coverage validating authorization, dataset ordering, harness controls, and generator determinism.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Launch the simulator:
   ```bash
   npm run dev
   ```
3. Hit `http://localhost:3000/health` to confirm the server is running.
4. Use the harness endpoints (`/harness/config`, `/harness/reset`, `/harness/time`) to seed and freeze studies before exercising data endpoints.

## Generating Golden Payloads

The project ships with a generator script that replays scenarios against the running simulator and captures responses under `golden-payloads/`.

```bash
npx ts-node -T scripts/generateGoldenPayloads.ts --config golden-scenarios/default/config.json --output golden-payloads/default --manifest manifest.json
```

Adjust `--config` to point at any scenario definition. See the [golden scenario guide](golden-scenarios/README.md) for configuration details, environment overrides, and authoring tips.

## Testing

Run the full Vitest suite (includes coverage thresholds):

```bash
npm test
```

During development you can use watch mode:

```bash
npm run test:watch
```

## Project Structure

- `src/` – Fastify server, plugins, and service logic.
- `golden-scenarios/` – Harness presets and replay definitions.
- `golden-payloads/` – Captured payloads and manifests produced by the generator.
- `tests/` – Vitest unit and functional specs.
- `docs/` – Reference material and task notes.

Refer to the [requirements summary](docs/requirements.md) for the full problem statement and acceptance criteria.

## Contributing

1. Fork and clone the repository.
2. Create a feature branch off `main`.
3. Add or update unit/functional tests for any behavior changes.
4. Regenerate relevant golden payloads when data shape changes.
5. Run `npm test` before submitting a pull request.

Issues and feature requests can be filed via GitHub. For questions about scenario authoring or payload expectations, start with the linked documentation above.
