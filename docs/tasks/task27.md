Extend Simulator Data Model to Support Raw + Regular Representations

work:
  - Update the simulator data model so every datapoint can store:
    - `valueRegular` (normalized/conformant)
    - `valueRaw` (as-entered)
    - optional `measurementUnitOid` (for raw unit dictionary support)
  - Ensure generation is deterministic:
    - introduce/confirm a single stable seed source used for all generation
    - stable ordering for sites, subjects, visits, forms, datapoints
  - Update generation logic to produce plausible paired values:
    - example: `DM.BRTHDTC` raw = `06 JUL 1978`, regular = `1978-07-06`
    - include at least one case where raw differs meaningfully from regular
  - Persist generated values until reset; reset regenerates consistently for the same seed/config.
  
constraints:
  - Maintain deterministic outputs.
  - Coverage >= 70%.
  - Stop after generator + tests pass; report commands and files changed.
