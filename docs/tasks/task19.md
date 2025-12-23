Implement versioned dataset endpoint with full query option handling.

Work:

- Introduce Fastify routes for `/RaveWebServices/studies/:studyOid/versions/:versionId/datasets/regular` and `/.../raw` including optional form and subject scoping.
- Validate `versionId` parameter and reuse common query parsing for `start`, `versionitem`, `decodesuffix`, and `rawsuffix`.
- Extend dataset builders to source metadata snapshots specific to a requested version and ensure emitted ItemData honors requested options.
- Produce deterministic golden payloads proving versioned datasets output (regular and raw) with each query toggle.
- Add functional tests for success, missing auth, invalid parameters (bad version, invalid query), and date filtering behavior.
- Update or add unit tests for builder/service logic to cover version-aware behavior and maintain coverage.

Constraints:
- Maintain deterministic outputs.
- Coverage >= 70%.
Stop after generator + tests pass; report commands and files changed.