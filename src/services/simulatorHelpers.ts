import { SimulatorSnapshot, SimulatorState } from './simulatorState';

export function computeCounts(
  simulatorState: SimulatorState,
  snapshot: SimulatorSnapshot,
  currentDay: number
) {
  let visits = 0;
  let forms = 0;
  let availableVisits = 0;

  for (const subject of snapshot.subjects) {
    visits += subject.visits.length;
    for (const visit of subject.visits) {
      for (const form of visit.forms) {
        forms += Object.keys(form.data).length;
      }
      if (simulatorState.isVisitAvailable(visit, currentDay)) {
        availableVisits += 1;
      }
    }
  }

  return {
    sites: snapshot.sites.length,
    subjects: snapshot.subjects.length,
    visits,
    availableVisits,
    unavailableVisits: visits - availableVisits,
    forms
  };
}

export function getTimeState(simulatorState: SimulatorState) {
  const simClock = simulatorState.getSimClock();
  return {
    simClock,
    freeze: simulatorState.isFrozen(),
    frozenDay: simulatorState.getFrozenDay()
  };
}

export function computeGeneratedAt(simulatorState: SimulatorState) {
  const simClock = simulatorState.getSimClock();
  const timestamp =
    simClock.simStartWallClock + simClock.simCurrentStudyDay * simClock.simSpeedMinutesPerDay * 60000;
  return {
    simClock,
    generatedAt: new Date(timestamp).toISOString()
  };
}

export function buildStatus(simulatorState: SimulatorState) {
  const { simClock } = getTimeState(simulatorState);
  const snapshot = simulatorState.getSnapshot();
  const counts = computeCounts(simulatorState, snapshot, simClock.simCurrentStudyDay);
  const availability = simulatorState.getSubjectAvailability(simClock.simCurrentStudyDay);
  return { simClock, counts, availability, freeze: simulatorState.isFrozen() };
}
