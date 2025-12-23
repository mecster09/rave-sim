Add a new golden scenario for high subject volume with average visits and average form data.

Work:
1) Create: golden-scenarios/high-subject-volume/config.json
   - studyName e.g. "RWS_HIGH_SUBJECT_VOLUME"
   - subjectCount: high (but still feasible for CI runtime)
   - visitCountPerSubject: average
   - formDataPointsPerVisit: average
   - Keep siteCount reasonable.
2) Ensure simulator generation remains performant:
   - Avoid O(N^2) operations when generating subjects/visits/forms.
   - Keep memory usage bounded.
3) Extend the golden payload generator to support this scenario.
4) Add functional tests that validate at least:
   - Subjects endpoint returns expected count and stable ordering
   - One dataset endpoint responds successfully (smoke test) and includes expected number of SubjectData entries (or a bounded assertion if output is huge)
5) Add a performance safety assertion in tests:
   - e.g., generation or request completes within a reasonable threshold in CI (avoid flakiness; use a generous upper bound).

Constraints:
- Tests must remain deterministic and not depend on wall clock time progression; use /harness/time freeze.
- Coverage >= 70%.

Stop after generator + tests pass; report commands and files changed.
