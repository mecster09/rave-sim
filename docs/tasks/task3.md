Implement a typed config + validation module.

Implementation:
- Create src/services/config.ts
- Export:
  - HarnessConfig interface
  - validateConfig(input): { value | error }
- Validation rules:
  - studyName: required non-empty string
  - siteCount >= 1
  - subjectCount >= 1
  - visitCountPerSubject >= 1
  - formDataPointsPerVisit >= 1
  - simSpeedMinutesPerDay ∈ [15..1440] step 15
  - resetOnStartup default false

Testing:
- Unit tests in tests/unit/config.test.ts
- Cover valid and invalid inputs.

Do NOT add endpoints yet.
