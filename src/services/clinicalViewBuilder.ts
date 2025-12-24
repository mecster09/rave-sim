import { SimulatorSnapshot, Visit, VisitFormDataPoint } from './simulatorState';
import { SnapshotSubject, SnapshotItemData } from './odmBuilder';

export interface ClinicalViewOptions {
  currentStudyDay: number;
  formOid?: string;
  subjectKey?: number;
  startStudyDay?: number;
  versionItem?: string;
  decodeSuffix?: string;
  rawSuffix?: string;
  mode: 'regular' | 'raw';
}

function isVisitAvailableForDay(visit: Visit, currentStudyDay: number): boolean {
  return Math.floor(currentStudyDay) >= visit.availableDay;
}

export function buildClinicalViewSubjects(snapshot: SimulatorSnapshot, options: ClinicalViewOptions): SnapshotSubject[] {
  const { currentStudyDay, formOid, subjectKey, startStudyDay, versionItem, decodeSuffix, rawSuffix, mode } = options;
  const normalizedFormOid = formOid?.trim() || undefined;
  const results: SnapshotSubject[] = [];

  for (const subject of snapshot.subjects) {
    if (typeof subjectKey === 'number' && subject.subjectKey !== subjectKey) {
      continue;
    }

    const visitEntries: SnapshotSubject['visits'] = [];
    let subjectHasMeasurementUnits = false;

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
          items: buildSnapshotItems(form.formOid, form.data, {
            mode,
            versionItem,
            decodeSuffix,
            rawSuffix
          })
        }))
        .filter(form => form.items.length > 0);

      if (forms.length === 0) {
        continue;
      }

      if (!subjectHasMeasurementUnits && forms.some(form => form.items.some(item => item.measurementUnitOid))) {
        subjectHasMeasurementUnits = true;
      }

      visitEntries.push({
        visitOid: visit.visitOid,
        forms
      });
    }

    if (visitEntries.length === 0) {
      continue;
    }

    if (mode === 'raw' && !subjectHasMeasurementUnits) {
      // Ensure raw datasets preserve at least one unit-bearing item.
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
  mode: 'regular' | 'raw';
  versionItem?: string;
  decodeSuffix?: string;
  rawSuffix?: string;
}

function buildSnapshotItems(
  formOid: string,
  source: Record<string, VisitFormDataPoint>,
  options: AugmentOptions
): SnapshotItemData[] {
  const { mode, versionItem, decodeSuffix, rawSuffix } = options;
  const items: SnapshotItemData[] = [];
  const fieldKeys = Object.keys(source).sort();

  for (const key of fieldKeys) {
    const point = source[key];
    if (mode === 'raw' && typeof point.valueRaw === 'undefined') {
      continue;
    }

    const baseValue = mode === 'raw' ? point.valueRaw : point.valueRegular;
    const measurementUnitOid = mode === 'raw' ? point.measurementUnitOid : undefined;

    items.push({
      itemOid: key,
      value: baseValue,
      measurementUnitOid
    });

    if (mode === 'regular' && rawSuffix && typeof point.valueRaw !== 'undefined') {
      items.push({
        itemOid: `${key}${rawSuffix}`,
        value: point.valueRaw,
        measurementUnitOid: point.measurementUnitOid
      });
    }

    if (decodeSuffix) {
      items.push({
        itemOid: `${key}${decodeSuffix}`,
        value: `DECODED-${String(baseValue)}`
      });
    }
  }

  if (versionItem) {
    items.push({
      itemOid: `${formOid}.${versionItem}`,
      value: `${computeVersionValue(formOid)}`
    });
  }

  return items;
}

function computeVersionValue(formOid: string): number {
  let hash = 0;
  for (let i = 0; i < formOid.length; i += 1) {
    hash += formOid.charCodeAt(i);
  }
  return (hash % 9) + 1;
}
