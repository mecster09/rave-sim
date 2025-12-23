Add a Basic Auth plugin compatible with this repo.

Implementation:
- Create src/plugins/basicAuth.ts exporting a Fastify plugin.
- Plugin enforces Basic Auth on all routes EXCEPT /health.
- Credentials read from process.env.BASIC_AUTH_USER and BASIC_AUTH_PASS.
- Missing or invalid credentials -> 401.

Testing:
- Unit tests for auth parsing/verification logic (tests/unit).
- Functional tests:
  - GET /health works without auth.
  - Add GET /protected-ping that returns { ok: true }.
  - /protected-ping returns 401 with no auth.
  - /protected-ping returns 401 with wrong creds.
  - /protected-ping returns 200 with valid creds.

Constraints:
- Use fastify-plugin for the plugin wrapper.
- Keep diffs minimal.
