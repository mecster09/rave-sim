Implement ODM XML builder utilities.

Implementation:
- Create src/services/odmBuilder.ts
- Support:
  - snapshot ODM (Clinical Views)
  - transactional ODM (Audit Records)
- Stable ordering, mdsol namespace support.
- Optional truncation mode (no closing </ODM>).

Testing:
- Unit tests:
  - XML parseable in normal mode
  - stable ordering via hash compare
  - truncation produces invalid XML
