Using the existing repo structure, do the following:

- Ensure buildServer() remains the Fastify factory used by all tests.
- Keep GET /health publicly accessible (no auth).
- Add at least one negative test case (method not allowed or unknown route).
- Do NOT add new endpoints beyond /health.

Testing requirements:
- Functional tests must use fastify.inject().
- Coverage must remain >= 70%.

Stop after tests pass and report:
- files changed
- how to run tests
- evidence coverage gate is enforced
