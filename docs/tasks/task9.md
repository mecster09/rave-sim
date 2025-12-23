Implement Subjects list endpoint.

Endpoint:
GET /RaveWebServices/studies/:studyOid/Subjects

Query params:
- include
- status

Behavior:
- default Active only
- include=inactive
- include=inactiveAndDeleted
- status=all overrides include

Testing:
- Functional tests covering each scenario.
- Use /harness/time to freeze time in tests.
- Validate XML content-type and subject keys.
