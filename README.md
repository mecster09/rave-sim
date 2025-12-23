# Rave Web Services Simulator

Rave-Sim is a Fastify-based simulator that reproduces a subset of the Rave Web Services API for deterministic functional testing, payload generation, and sandbox experimentation. The service ships with a configurable harness so scenarios can be seeded, frozen in time, and replayed with predictable outputs.

## Key Features

- **Deterministic Harness** – Control study composition (sites, subjects, visits, forms) and simulation time using the `/harness/*` endpoints, including forced streaming failure toggles for clinical datasets.
- **Dataset Coverage** – Serve Clinical View datasets (regular and raw), versioned snapshots, and the Clinical Audit Records adapter with pagination, enhanced modes, and truncation behaviors matching production quirks.
- **Golden Payloads** – Generate reproducible XML or JSON datasets for regression testing, backed by manifests with hashes and response metadata.
- **Scenario Library** – Curated presets (default, partial enrollment, high-volume variants, streaming-failure) that exercise performance, ordering, and transport edge cases.
- **Test Suite** – Comprehensive Vitest functional and unit coverage validating authorization, dataset ordering, harness controls, and generator determinism.

## API Overview

| Endpoint | Description |
| --- | --- |
| `/health` | Unprotected readiness probe.
| `/harness/config`, `/harness/reset`, `/harness/time`, `/harness/speed`, `/harness/status` | Authenticated simulator controls for configuration, reset, clock freeze, and diagnostics.
| `/RaveWebServices/studies/:studyOid/datasets/regular` | Clinical View regular dataset with query options such as `truncate`, `formOid`, and `subjectKey`.
| `/RaveWebServices/studies/:studyOid/datasets/raw` | Raw dataset variant supporting `start`, `decodesuffix`, `rawsuffix`, and `versionitem` filters.
| `/RaveWebServices/studies/:studyOid/versions/:versionId/datasets/(regular|raw)` | Version-locked datasets derived from deterministic seeds.
| `/RaveWebServices/datasets/ClinicalAuditRecords.odm` | Clinical audit trail with pagination, Unicode toggles, and enhanced mode support.
| `/RaveWebServices/studies/:studyOid/Subjects` | Subject roster with status/include filters.

All parity endpoints require HTTP Basic Auth with credentials defined via `BASIC_AUTH_USER` / `BASIC_AUTH_PASS`.

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

Adjust `--config` to point at any scenario definition, such as `golden-scenarios/streaming-failure/config.json` for the truncated Clinical View capture or the high-volume variants for load-focused payloads. See the [golden scenario guide](golden-scenarios/README.md) for configuration details, environment overrides, and authoring tips. Sample replay commands live in [docs/golden-scenario-curl-examples.md](docs/golden-scenario-curl-examples.md).

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

Refer to the [requirements summary](docs/requirements.md) for the full problem statement and acceptance criteria, and review the [project constitution](docs/constitution.md) for task-by-task guardrails.

Active and historical work items live in [docs/tasks/task22.md](docs/tasks/task22.md) alongside prior task briefs.

## Contributing

1. Fork and clone the repository.
2. Create a feature branch off `main`.
3. Add or update unit/functional tests for any behavior changes.
4. Regenerate relevant golden payloads when data shape changes.
5. Run `npm test` before submitting a pull request.

Issues and feature requests can be filed via GitHub. For questions about scenario authoring or payload expectations, start with the linked documentation above.
