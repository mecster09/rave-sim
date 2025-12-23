Add golden payload generation support.

Implementation:
- CLI/script:
  - apply config + seed
  - reset
  - set simStudyDay and freeze
  - execute scenario requests
  - write payloads to golden-payloads/<family>/<scenario>.xml
  - generate manifest.json with SHA-256 checksums

Testing:
- Regression test replays one scenario and byte-compares to golden.
