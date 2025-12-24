Implement Clinical View Dataset Endpoint Mode Handling (regular/raw/rawsuffix)

work:
  - In the parity layer route handler(s) for clinical view datasets, implement mode selection based on:
    - `{regular-or-raw}` path segment (`regular` or `raw`)
    - optional query `rawsuffix` (valid only when `{regular-or-raw}=regular`)
  - Ensure response XML generation rules:
    - regular: emit `ItemData` with normalized values only
    - raw: emit `ItemData` with raw values; include `<MeasurementUnitRef>` when applicable
    - regular+rawsuffix: emit both:
      - base `ItemData ItemOID="X" Value="{regular}"`
      - suffixed `ItemData ItemOID="X{rawsuffix}" Value="{raw}"`
  - Enforce deterministic element ordering within ODM:
    - Study → Subject → Visit → Form → ItemGroup → ItemData
    - ItemData ordered by datapoint ordinal/OID
  - Add validation:
    - if `rawsuffix` provided for `{regular-or-raw}=raw`, return `400` with deterministic error body
    
constraints:
  - Maintain deterministic outputs.
  - Coverage >= 70%.
  - Stop after generator + tests pass; report commands and files changed.
