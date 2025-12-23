Refactor Fastify to best-practice structure (routes, services, utils)

Work:
- Transform the existing project into a best-practice Fastify structure focusing ONLY on: routes/ services/ utils/
- Do NOT introduce new features or change API behavior.

Rules for this refactor
- This is a structural refactor ONLY: zero behavior changes.
- Move code, do not rewrite.
- Keep exports stable where possible; if an import path changes, update it.
- Preserve buildServer() pattern and test injection pattern.
- No renaming of public endpoints, response shapes, status codes, or auth behavior.

Implementation specifics
- Create a route registration pattern:
  - Each route file exports a function registerXRoutes(fastify) that registers routes for that area.
  - server.ts calls these register functions.
- Create a services pattern:
  - services expose functions/classes with no Fastify dependency.
  - services accept dependencies/config/state explicitly.
- Create a utils pattern:
  - pure functions only (no Fastify, no global mutable state).

Constraints:
- Maintain deterministic outputs.
- Coverage >= 70%.
Stop after generator + tests pass; report commands and files changed.