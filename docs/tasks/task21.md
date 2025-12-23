Introduce streaming-failure ODM scenario and associated golden payload/tests

Work:

- Identify an endpoint (e.g., Clinical View regular dataset) to simulate streaming failure by omitting the closing ODM tag under a controlled scenario flag.
- Extend simulator or request-matching logic to trigger truncated payloads deterministically without affecting default responses.
- Create a new golden payload representing the truncated ODM body and update the manifest accordingly.
- Add functional tests verifying the truncated response (HTTP 200 with incomplete XML) and ensuring normal scenarios remain unaffected.
- Include negative tests confirming the scenario still enforces authentication and parameter validation.
- Update documentation or scenario README to explain when and how the streaming-failure payload is generated.

Constraints:
- Maintain deterministic outputs.
- Coverage >= 70%.
Stop after generator + tests pass; report commands and files changed.