Regenerate documentation.

Work:

- Update README.md and golden-scenarios/README.md to reflect newly implemented endpoints, scenarios, and usage patterns.
- Refresh docs/requirements.md to align with current API surface, ensuring endpoint lists, query options, and scenarios match implemented behavior.
- Document new curl examples for raw/versioned datasets, enhanced audit modes, and streaming-failure scenario in docs/golden-scenario-curl-examples.md.
- Review task documentation and constitution updates for consistency, adding cross-links where helpful.
- Verify documentation builds cleanly (lint/markdown checks if available) and that referenced commands align with package.json scripts.

Constraints:
- Maintain deterministic outputs.
- Coverage >= 70%.
Stop after generator + tests pass; report commands and files changed.