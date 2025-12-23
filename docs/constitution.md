GOVERNING RULES (MUST FOLLOW FOR EVERY CHANGE)

You are coding a Node.js Fastify API using TypeScript.

Tooling (MANDATORY)
- Web framework: Fastify
- Language: TypeScript
- Test runner: Vitest
- Coverage: Vitest coverage (c8) with a global minimum of 70% line coverage

Scope & Change Control
- Implement ONLY what is requested in this task. Do not pre-emptively build future steps.
- Keep diffs small, focused, and easy to review.
- Do not refactor unrelated code.
- If you must make an assumption (e.g., library choice), state it explicitly and choose the simplest, most standard option.

Testing & Quality Gates (NON-NEGOTIABLE)
- Unit test coverage MUST be >= 70% lines overall (enforced via Vitest config).
- Every API endpoint added or modified MUST include functional API tests that:
  - start Fastify in-memory (no real network ports),
  - use fastify.inject(),
  - assert status codes and key response fields/headers,
  - include at least one negative test (e.g., missing auth, invalid input).
- All business logic must be unit tested separately from HTTP tests.
- The build MUST fail if coverage drops below 70%.

Security & Safety
- All endpoints except /health, /harness/status and /harness/time MUST be protected by Basic Auth unless explicitly stated.
- Validate all inputs (query, params, body); fail closed with 4xx errors.
- Never log credentials or sensitive values.
- No background jobs, cron, or outbound network calls unless explicitly required.

Deliverables Per Task
- Provide:
  1) a list of files changed/added,
  2) commands to run tests and view coverage,
  3) at least one curl example (or inject example) to validate behavior,
  4) a brief explanation of how the tests prove correctness.
  5) a commit message for git

Stop Condition
- Stop after implementing the requested task and making all tests pass with coverage >= 70%.
- Do NOT proceed to the next task unless explicitly instructed.
