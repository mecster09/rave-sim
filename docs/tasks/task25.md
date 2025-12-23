Update harness requirements and implementation for Section 1.5.7 (Metadata) correction

Work:
- Update endpoint and align supporting narrative (scenarios, payload notes, simulator expectations) in the requirements doc to match the update Section 1.5.7 `/metadata/studies/{study-name}/versions/{version-id}` and drop references to the old implementation of Section 1.5.7 endpoint.
- Update the harness implementation so the metadata route returns deterministic Study and Library metadata consistent with the corrected requirements.
- Refresh any bundled payload fixtures or generator outputs to mirror the new metadata structure and eliminate obsolete samples.
- Expand or adjust automated tests to validate the updated metadata endpoint behavior and payload determinism.

Constraints:
- Maintain deterministic outputs.
- Coverage >= 70%.
Stop after generator + tests pass; report commands and files changed.