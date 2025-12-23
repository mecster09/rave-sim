Implement Clinical View raw with full query option handling.

Work:

- Add Fastify handlers for `/RaveWebServices/studies/:studyOid/datasets/raw`, `/raw/:formOid`, and `/subjects/:subjectKey/datasets/raw` mirroring the existing regular dataset logic.
- Parse and validate `start`, `versionitem`, `decodesuffix`, and `rawsuffix` query parameters; ensure unsupported combinations return 400.
- Extend `clinicalViewBuilder` (or related service) to inject CRF version, decode suffix, and raw value ItemData when requested while keeping output deterministic.
- Update simulator or builder utilities to respect `start` filters by emitting only ItemData on/after the requested datetime.
- Generate or refresh golden payloads demonstrating raw dataset responses with each query option exercised.
- Write functional tests covering positive and negative cases for the new endpoints and query options, including auth failures and invalid parameter scenarios.
- Add or update unit tests for any builder/service changes to maintain coverage.

Constraints:
- Maintain deterministic outputs.
- Coverage >= 70%.
Stop after generator + tests pass; report commands and files changed.