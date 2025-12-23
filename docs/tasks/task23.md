Implement VersionFolders.odm endpoint and scenario changes.

Work:
- Review [docs/requirements.md](docs/requirements.md#L347-L406) to confirm endpoint scope, query params, and success vs streaming-failure behavior.
- Extend Fastify routing to handle GET /RaveWebServices/datasets/VersionFolders.odm with Basic Auth validation and deterministic payload selection.
- Expose simulator metadata for CRF versions, folder lists, and streaming-failure toggles consumed by scenarios VF-001..VF-003.
- Generate golden payloads under golden-payloads/version-folders/ for complete, truncated, and unauthorized responses, updating manifest.json accordingly.
- Add targeted tests ensuring scenario selection, deterministic bytes, and coverage >= 70%.
- Update documentation (README, requirements, curl examples) if new flags or behaviors surface during implementation.


Constraints:
- Maintain deterministic outputs.
- Coverage >= 70%.
Stop after generator + tests pass; report commands and files changed.