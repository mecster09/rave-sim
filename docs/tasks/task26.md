Add Swagger API 

Work:
- Select a swagger/OpenAPI integration for Fastify (e.g., fastify-swagger) and add dependencies plus initialization wiring.
- Define an OpenAPI 3.1 document that covers every existing endpoint, including auth requirements and payload schemas.
- Expose the generated JSON at a discoverable route (e.g., /swagger.json) and mount the Swagger UI for interactive browsing.
- Update automated coverage by adding tests that verify the docs route is reachable and deterministic.
- Document usage in README/requirements so contributors know how to regenerate or extend the spec.


Constraints:
- Maintain deterministic outputs.
- Coverage >= 70%.
Stop after generator + tests pass; report commands and files changed.