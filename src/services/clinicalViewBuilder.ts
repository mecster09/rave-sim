import { SimulatorSnapshot, Visit } from './simulatorState';
import { SnapshotSubject } from './odmBuilder';

export interface ClinicalViewOptions {
  currentStudyDay: number;
  formOid?: string;
  subjectKey?: number;
}

function isVisitAvailableForDay(visit: Visit, currentStudyDay: number): boolean {
  return Math.floor(currentStudyDay) >= visit.availableDay;
}

export function buildClinicalViewSubjects(snapshot: SimulatorSnapshot, options: ClinicalViewOptions): SnapshotSubject[] {
  const { currentStudyDay, formOid, subjectKey } = options;
  const normalizedFormOid = formOid?.trim() || undefined;
  const results: SnapshotSubject[] = [];

  for (const subject of snapshot.subjects) {
    if (typeof subjectKey === 'number' && subject.subjectKey !== subjectKey) {
      continue;
    }

    const visitEntries: SnapshotSubject['visits'] = [];

    for (const visit of subject.visits) {
      if (!isVisitAvailableForDay(visit, currentStudyDay)) {
        continue;
      }

      const forms = visit.forms
        .filter(form => !normalizedFormOid || form.formOid === normalizedFormOid)
        .map(form => ({
          formOid: form.formOid,
          data: { ...form.data }
        }))
        .filter(form => Object.keys(form.data).length > 0);

      if (forms.length === 0) {
        continue;
      }

      visitEntries.push({
        visitOid: visit.visitOid,
        forms
      });
    }

    if (visitEntries.length === 0) {
      continue;
    }

    results.push({
      subjectKey: String(subject.subjectKey),
      siteLocationOid: subject.siteLocationOid,
      subjectStatus: subject.subjectStatus,
      visits: visitEntries
    });
  }

  return results;
}
