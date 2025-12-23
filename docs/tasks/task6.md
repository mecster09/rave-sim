Add simulation clock logic.

Implementation:
- Extend simulatorState with:
  - simStartWallClock
  - simCurrentStudyDay
  - simSpeedMinutesPerDay
- simCurrentStudyDay computed from wall clock unless frozen.
- Enforce visit dependency: visit N unavailable until visit N-1 available.
- Reflect availability in /harness/status.

Testing:
- Unit tests for time math.
- Unit tests for dependency rules.
