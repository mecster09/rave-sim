Add a new golden scenario for average number of subjects with high number of visits and average form data.

Work:
1) Create: golden-scenarios/high-visit-volume/config.json
   - studyName e.g. "RWS_HIGH_VISIT_VOLUME"
   - subjectCount: average
   - visitCountPerSubject: high (but feasible for CI)
   - formDataPointsPerVisit: average
2) Verify visit dependency and time-slicing logic behaves correctly at deeper visit chains:
   - Ensure visit N never appears before visit N-1 is available.
3) Extend golden generator to support the new scenario.
4) Add functional tests:
   - Freeze time at early day and verify later visits absent
   - Freeze time at later day and verify more visits appear
   - Assert dependency behavior for at least one subject (e.g., visit 10 not present unless visit 9 present)

Constraints:
- Maintain deterministic outputs.
- Coverage >= 70%.
Stop after generator + tests pass; report commands and files changed.
