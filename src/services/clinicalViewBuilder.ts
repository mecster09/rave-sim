import { SimulatorSnapshot, Visit } from './simulatorState';
import { SnapshotSubject } from './odmBuilder';

export interface ClinicalViewOptions {
  currentStudyDay: number;
  formOid?: string;
  subjectKey?: number;
  startStudyDay?: number;
  versionItem?: string;
  decodeSuffix?: string;
  rawSuffix?: string;
}

function isVisitAvailableForDay(visit: Visit, currentStudyDay: number): boolean {
  return Math.floor(currentStudyDay) >= visit.availableDay;
}

export function buildClinicalViewSubjects(snapshot: SimulatorSnapshot, options: ClinicalViewOptions): SnapshotSubject[] {
  const { currentStudyDay, formOid, subjectKey, startStudyDay, versionItem, decodeSuffix, rawSuffix } = options;
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

      if (typeof startStudyDay === 'number' && visit.availableDay < Math.floor(startStudyDay)) {
        continue;
      }

      const forms = visit.forms
        .filter(form => !normalizedFormOid || form.formOid === normalizedFormOid)
        .map(form => ({
          formOid: form.formOid,
          data: augmentFormData(form.formOid, form.data, {
            versionItem,
            decodeSuffix,
            rawSuffix
          })
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

interface AugmentOptions {
  versionItem?: string;
  decodeSuffix?: string;
  rawSuffix?: string;
}

function augmentFormData(
  formOid: string,
  source: Record<string, string | number>,
  options: AugmentOptions
): Record<string, string | number> {
  const { versionItem, decodeSuffix, rawSuffix } = options;
  const result: Record<string, string | number> = { ...source };

  const fieldKeys = Object.keys(source);

  for (const key of fieldKeys) {
    const value = source[key];
    if (decodeSuffix) {
      result[`${key}${decodeSuffix}`] = `DECODED-${String(value)}`;
    }
    if (rawSuffix) {
      result[`${key}${rawSuffix}`] = `RAW-${String(value)}`;
    }
  }

  if (versionItem) {
    result[`${formOid}.${versionItem}`] = `${computeVersionValue(formOid)}`;
  }

  return result;
}

function computeVersionValue(formOid: string): number {
  let hash = 0;
  for (let i = 0; i < formOid.length; i += 1) {
    hash += formOid.charCodeAt(i);
  }
  return (hash % 9) + 1;
}
