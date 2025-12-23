Align ClinicalAuditRecords mode parsing with spec and emit pre-backfill error payloads

Work:

- Update the ClinicalAuditRecords handler to accept spec-compliant mode values (`default`, `enhanced`, `all`) and normalize any legacy aliases.
- Track audit backfill readiness in simulator state or configuration to decide when enhanced mode should succeed.
- Emit deterministic ODM error payload when enhanced/all requests arrive before backfill completes, and update the related golden payloads and manifest.
- Ensure pagination, unicode, and truncate behaviour stays intact after refactoring mode logic.
- Add functional tests covering mode validation, pre-backfill error, successful enhanced/all responses, and authentication failures.
- Add or adjust unit tests for helpers managing mode parsing and backfill state to maintain coverage.

Constraints:
- Maintain deterministic outputs.
- Coverage >= 70%.
Stop after generator + tests pass; report commands and files changed.