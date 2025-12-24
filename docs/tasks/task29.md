Update Scenario Tables + Golden Snapshot Manifest for Mode-Specific Cases

work:
  - Extend scenario definitions to add mode-specific scenarios for subject-scoped endpoint calls:
    - CV-REG-001 (regular)
    - CV-RAW-001 (raw)
    - CV-REG-RAW-001 (regular + rawsuffix)
  - Add/extend golden snapshot generation support so each scenario maps to a file:
    - `golden-payloads/ClinicalViews/CV-REG-001.xml`
    - `golden-payloads/ClinicalViews/CV-RAW-001.xml`
    - `golden-payloads/ClinicalViews/CV-REG-RAW-001.xml`
  - Update `manifest.json` (or equivalent manifest structure) entries to include:
    - request path + query signature
    - simStudyDay
    - seed + config hash
    - SHA-256 for each artifact
  - Ensure golden generation uses explicit `simStudyDay` and frozen time.
  
constraints:
  - Maintain deterministic outputs.
  - Coverage >= 70%.
  - Stop after generator + tests pass; report commands and files changed.
