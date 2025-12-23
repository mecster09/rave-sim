Implement the in-memory simulator state core.

Implementation:
- Create src/services/simulatorState.ts
- State must be deterministic using a fixed seed.
- Generate:
  - sites with stable LocationOID + name
  - subjects with blinded numeric keys starting at 100001
  - visits per subject with stable VisitOID sequence
  - form datapoints per visit (DM/VS/AE style deterministic mock data)
- State persists until reset() is called.

Testing:
- Unit tests verify:
  - same config + seed => identical snapshot hash
  - reset() regenerates identical data

No time logic, no ODM, no endpoints yet.
