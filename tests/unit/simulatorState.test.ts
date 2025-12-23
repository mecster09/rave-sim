import { describe, expect, it } from 'vitest';
import { HarnessConfig } from '../../src/services/config';
import { SimulatorState, hashSnapshot } from '../../src/services/simulatorState';

const baseConfig: HarnessConfig = {
  studyName: 'Sim Study',
  siteCount: 2,
  subjectCount: 3,
  visitCountPerSubject: 2,
  formDataPointsPerVisit: 4,
  simSpeedMinutesPerDay: 60,
  resetOnStartup: false
};

describe('SimulatorState', () => {
  it('produces identical snapshots for same seed and config', () => {
    const seed = 98765;
    const stateA = new SimulatorState(baseConfig, seed);
    const stateB = new SimulatorState(baseConfig, seed);

    const hashA = stateA.getSnapshotHash();
    const hashB = stateB.getSnapshotHash();

    expect(hashA).toBe(hashB);
    expect(stateA.getSnapshot()).toEqual(stateB.getSnapshot());
  });

  it('persists snapshot until reset and regenerates identical data', () => {
    const seed = 555;
    const state = new SimulatorState(baseConfig, seed);

    const firstSnapshot = state.getSnapshot();
    const secondSnapshot = state.getSnapshot();

    expect(firstSnapshot).toBe(secondSnapshot);

    const resetSnapshot = state.reset();
    expect(resetSnapshot).not.toBe(firstSnapshot);
    expect(resetSnapshot).toEqual(firstSnapshot);

    const postResetHash = state.getSnapshotHash();
    expect(postResetHash).toBe(state.getSnapshotHash());
  });

  it('produces deterministic fallback form values and snapshot hashes', () => {
    const config: HarnessConfig = {
      ...baseConfig,
      subjectCount: 1,
      formDataPointsPerVisit: 7
    };

    const seed = 123;
    const stateA = new SimulatorState(config, seed);
    const stateB = new SimulatorState(config, seed);

    const snapshotA = stateA.getSnapshot();
    const snapshotB = stateB.getSnapshot();

    expect(snapshotA.subjects[0].visits[0].forms).toHaveLength(7);
    const fallbackValue = snapshotA.subjects[0].visits[0].forms[6].value;
    expect(typeof fallbackValue).toBe('string');
    expect(fallbackValue).toMatch(/^VAL-AE-TERM-/);
    expect(snapshotA).toEqual(snapshotB);
    expect(hashSnapshot(snapshotA)).toBe(hashSnapshot(snapshotB));
  });

  it('computes study day from wall clock and supports freezing', () => {
    let currentTime = 0;
    const nowProvider = () => currentTime;
    const config: HarnessConfig = { ...baseConfig, simSpeedMinutesPerDay: 30 };
    const state = new SimulatorState(config, 42, nowProvider);

    expect(state.getSimClock().simCurrentStudyDay).toBe(0);

    currentTime += 30 * 60000;
    expect(state.getSimClock().simCurrentStudyDay).toBeCloseTo(1);

    currentTime += 15 * 60000;
    expect(state.getSimClock().simCurrentStudyDay).toBeCloseTo(1.5);

    state.freeze();
    currentTime += 60 * 60000;
    expect(state.getSimClock().simCurrentStudyDay).toBeCloseTo(1.5);

    state.unfreeze();
    expect(state.getSimClock().simCurrentStudyDay).toBeCloseTo(1.5);

    currentTime += 30 * 60000;
    expect(state.getSimClock().simCurrentStudyDay).toBeCloseTo(2.5);
  });

  it('enforces sequential visit availability dependencies', () => {
    const config: HarnessConfig = {
      ...baseConfig,
      subjectCount: 1,
      visitCountPerSubject: 3
    };

    const state = new SimulatorState(config, 77);

    const day0 = state.getSubjectAvailability(0)[0].visits.map(v => v.isAvailable);
    expect(day0).toEqual([true, false, false]);

    const day1 = state.getSubjectAvailability(1)[0].visits.map(v => v.isAvailable);
    expect(day1).toEqual([true, true, false]);

    const day2 = state.getSubjectAvailability(2)[0].visits.map(v => v.isAvailable);
    expect(day2).toEqual([true, true, true]);
  });
});
