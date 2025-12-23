# Golden Scenarios and Payloads

This directory defines deterministic simulator presets ("golden scenarios") used to generate reusable payloads in `golden-payloads/`. Each scenario describes how the harness should seed the simulator, which day to freeze, and which HTTP requests to replay when capturing payloads.

## Directory Layout

- `*/config.json` — Scenario definition containing harness settings and the list of requests to replay.
- Subfolders under `golden-payloads/` mirror scenario families (such as `datasets/` or `subjects/`) and hold the captured XML payloads.
- Each payload run emits a manifest at `golden-payloads/<scenario>/manifest.json` describing response metadata and sha256 hashes for auditing.

## Config Anatomy

A config file is a JSON object with the shape:

```json
{
  "harnessConfig": {
    "studyName": "RWS_HIGH_FORM_DATA",
    "siteCount": 3,
    "subjectCount": 20,
    "visitCountPerSubject": 4,
    "formDataPointsPerVisit": 18,
    "simSpeedMinutesPerDay": 60,
    "resetOnStartup": false,
    "randomSeed": 246810,
    "truncateOdm": false,
    "forceClinicalViewStreamFailure": false,
    "forceVersionFoldersStreamFailure": false
  },
  "simStudyDay": 2.75,
  "freeze": true,
  "scenarios": [
    {
      "family": "datasets",
      "name": "high-form-snapshot",
      "request": {
        "method": "GET",
        "url": "/RaveWebServices/studies/RWS_HIGH_FORM_DATA/datasets/regular"
      }
    }
  ]
}
```

Key sections:

- `harnessConfig` — Seed data the simulator applies via `/harness/config`. All numeric fields influence volume:
  - `siteCount`, `subjectCount`, `visitCountPerSubject`, and `formDataPointsPerVisit` scale the generated study.
  - `randomSeed` keeps outputs deterministic. Change only when you intentionally want a new data shape.
  - `truncateOdm` toggles ODM truncation when the downstream request sets `truncate=true`.
  - `forceClinicalViewStreamFailure` forces the Clinical View regular dataset to end early, simulating a streaming failure by omitting the closing ODM tag.
  - `forceVersionFoldersStreamFailure` omits the closing `</ODM>` from VersionFolders.odm to simulate a streaming failure scenario.
- `simStudyDay` — Day to advance the simulator clock before capturing.
- `freeze` — When `true`, the harness locks simulated time during the replay to prevent drift.
- `scenarios` — Each entry defines one capture. Scenarios share the seeded harness state and produce one payload file named `<family>/<name>.xml` (JSON for raw dataset captures when configured).

## Environment and Auth

The generator uses basic auth for every capture. Defaults are `test-user` / `test-pass`, but you can override by exporting environment variables before running the generator:

```bash
set BASIC_AUTH_USER=custom-user
set BASIC_AUTH_PASS=custom-pass
```

On Windows PowerShell use `$Env:BASIC_AUTH_USER = "custom-user"` instead.

## Regenerating Payloads

1. Ensure the simulator builds: `npm install && npm run build` (or rely on `ts-node` during development).
2. Choose the scenario config you want to replay, for example `golden-scenarios/high-form-data/config.json`.
3. Run the generator script:

```bash
npx ts-node -T scripts/generateGoldenPayloads.ts --config golden-scenarios/high-form-data/config.json --output golden-payloads/high-form-data --manifest manifest.json
```

The script will:

- Resolve and apply `harnessConfig` to `/harness/config` with `applyAndReset` semantics.
- Reset, freeze time (when `freeze` is `true`), and replay each `request` listed under `scenarios`.
- Write captured bodies under the output directory following `<family>/<name>.xml`.
- Update the manifest with the HTTP status, byte size, and sha256 hash for each dataset.

### Scenario Families

- `clinical-view` — Standard snapshots of the Clinical View datasets. Includes the `streaming-failure` capture that enables `forceClinicalViewStreamFailure` to truncate ODM output intentionally.
- `datasets` — Harness-driven extracts for raw and versioned datasets as XML or JSON depending on the scenario definition.
- `subjects` — Subject roster variations across enrollment states (active-only, with inactive, status=all).
- `audit` — Clinical Audit Records payloads covering pagination and enhanced modes.
- `version-folders` — Administrative folder metadata exports, including VF-002 which toggles `forceVersionFoldersStreamFailure` for streaming failure parity.

## Adding New Scenarios

1. Duplicate an existing config and adjust `harnessConfig` values so the generated study matches the target volume.
2. Update `simStudyDay` to the point in simulated time you want to observe and set `freeze` to `true` for deterministic payloads.
3. Append new `scenarios` entries for each request you want to capture. Keep `name` unique within its `family`.
4. Run the generator command pointing at the new config and commit both the config and the resulting payload files.
5. Extend functional tests (for example under `tests/functional/`) to validate ordering, determinism, and authentication for the new payloads.

Use `golden-scenarios/streaming-failure/config.json` when you need to regenerate the truncated Clinical View payload; the harness config enables `forceClinicalViewStreamFailure` so the capture reproduces the simulated streaming failure. For VersionFolders-specific captures, reference the JSON files under `golden-scenarios/version-folders/` — VF-002 enables `forceVersionFoldersStreamFailure` to recreate the intentionally truncated payload, while VF-003 records the 401 JSON error.

Following this workflow keeps the simulator data reproducible and ensures every golden payload has a documented origin.
