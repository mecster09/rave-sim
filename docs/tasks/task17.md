Add a new golden scenario for average number of subjects and visits, but high form data per visit.

Work:
1) Create: golden-scenarios/high-form-data/config.json
   - studyName e.g. "RWS_HIGH_FORM_DATA"
   - subjectCount: average
   - visitCountPerSubject: average
   - formDataPointsPerVisit: high (but feasible in CI)
2) Ensure the ODM builder and simulator form generation:
   - remain deterministic
   - preserve stable ordering of ItemData within forms
   - handle missingness rules consistently (if implemented)
3) Extend golden generator to support the new scenario.
4) Add functional tests:
   - Call a dataset endpoint and assert:
     - expected form OIDs exist
     - ItemData count (or a representative subset) is higher than in default scenario
     - ordering is stable (e.g., compare hash of response body for same request)

Constraints:
- Use /harness/time to freeze time for deterministic availability.
- Coverage >= 70%.
Stop after generator + tests pass; report commands and files changed.
