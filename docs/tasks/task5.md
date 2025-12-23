Add control plane endpoints using the existing server factory.

Endpoints (all require Basic Auth):
- GET /harness/config
- PUT /harness/config (supports applyMode: apply | applyAndReset)
- GET /harness/speed
- PUT /harness/speed
- POST /harness/reset
- GET /harness/status

Implementation:
- Use config validation module.
- Use simulatorState for reset and status.
- Status returns: config, sim clock placeholder, entity counts.

Testing:
- Functional tests in tests/functional:
  - missing auth -> 401
  - invalid payload -> 400
  - valid changes reflected in status

Coverage must remain >= 70%.
