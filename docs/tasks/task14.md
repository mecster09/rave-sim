Add a new golden scenario for partial enrollment.

Repo conventions:
- Scenarios live under golden-scenarios/<scenarioName>/config.json (do not place in root).
- Golden outputs live under golden-payloads/<scenarioName>/...
- Tests must use fastify.inject() and coverage must remain >= 70%.

Work:
1) Create: golden-scenarios/partial-enrollment/config.json
   - Use a smaller dataset suitable for deterministic assertions.
   - Set studyName to something unique (e.g., "RWS_PARTIAL_ENROLLMENT").
   - Choose config values that make partial enrollment meaningful (e.g., enough subjects and visits).
2) Add a mechanism to represent partial enrollment in the simulator (if not already present):
   - Deterministic rule: only a subset of subjects are "enrolled/active" by a given simStudyDay.
   - Must be deterministic based on seed/config (no randomness without seed).
3) Update/extend the golden payload generator so it can:
   - load scenario config from golden-scenarios/partial-enrollment/config.json
   - reset + seed + freeze time
   - generate outputs into golden-payloads/partial-enrollment/...
   - update manifest.json accordingly
4) Add/extend functional tests to cover this scenario:
   - Freeze time to a low simStudyDay where only some subjects are active.
   - Verify Subjects endpoint returns fewer active subjects than total.
   - Verify behavior under include/status query params is stable and correct.

Stop after:
- generator produces payloads for this scenario
- tests pass and coverage >= 70%
Provide:
- files changed
- commands to generate goldens
- commands to run tests
