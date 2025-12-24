Add Unit Tests for XML Structural Differences Across Modes

work:
  - Add tests covering:
    - regular returns only normalized values (no suffixed raw ItemOIDs)
    - raw returns as-entered values and can include `<MeasurementUnitRef>`
    - regular+rawsuffix returns BOTH base and suffixed ItemData for the same field
    - invalid rawsuffix usage on `/datasets/raw` returns `400`
  - Test determinism:
    - same seed/config + same simStudyDay produces byte-identical XML outputs across multiple runs
  - Validate ordering:
    - ItemData output order is stable and matches expected fixture ordering
  - Ensure tests compare against golden payloads where applicable (byte-for-byte).
  
constraints:
  - Maintain deterministic outputs.
  - Coverage >= 70%.
  - Stop after generator + tests pass; report commands and files changed.
