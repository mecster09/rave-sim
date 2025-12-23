import crypto from 'node:crypto';
import { HarnessConfig } from './config';

interface Site {
  locationOid: string;
  name: string;
}

export interface Visit {
  visitOid: string;
  sequenceNumber: number;
  forms: VisitForm[];
  availableDay: number;
}

interface VisitForm {
  formOid: string;
  data: Record<string, PrimitiveValue>;
}

type PrimitiveValue = string | number;

interface Subject {
  subjectKey: number;
  siteLocationOid: string;
  subjectStatus: SubjectStatus;
  visits: Visit[];
}

export interface SimulatorSnapshot {
  sites: Site[];
  subjects: Subject[];
}

export type SubjectStatus = 'Active' | 'Inactive' | 'Deleted';

export interface SubjectAvailability {
  subjectKey: number;
  visits: Array<{
    visitOid: string;
    sequenceNumber: number;
    availableDay: number;
    isAvailable: boolean;
  }>;
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = Math.imul(1664525, state) + 1013904223;
    state >>>= 0;
    return state / 0xffffffff;
  };
}

function deterministicValue(rng: () => number, formOid: string, fieldOid: string): string | number {
  if (formOid === 'DM') {
    if (fieldOid === 'SEX') {
      return rng() > 0.5 ? 'M' : 'F';
    }
    if (fieldOid === 'AGE') {
      return Math.floor(rng() * 60) + 18;
    }
  }

  if (formOid === 'VS') {
    if (fieldOid === 'SYS') {
      return Math.floor(rng() * 50) + 100;
    }
    if (fieldOid === 'DIA') {
      return Math.floor(rng() * 40) + 60;
    }
  }

  if (formOid === 'AE') {
    if (fieldOid === 'SEVERITY') {
      const severities = ['MILD', 'MODERATE', 'SEVERE'];
      return severities[Math.floor(rng() * severities.length)];
    }
  }

  return `VAL-${formOid}-${fieldOid}-${Math.floor(rng() * 1000)}`;
}

function createSites(config: HarnessConfig): Site[] {
  const sites: Site[] = [];
  for (let i = 0; i < config.siteCount; i += 1) {
    const id = i + 1;
    sites.push({
      locationOid: `SITE-${id.toString().padStart(3, '0')}`,
      name: `Site ${id}`
    });
  }
  return sites;
}

function createVisits(config: HarnessConfig, rng: () => number): Visit[] {
  const visits: Visit[] = [];
  for (let i = 0; i < config.visitCountPerSubject; i += 1) {
    const visitOid = `VISIT-${(i + 1).toString().padStart(3, '0')}`;
    const forms = createFormData(config, rng);
    visits.push({
      visitOid,
      sequenceNumber: i + 1,
      forms,
      availableDay: i
    });
  }
  return visits;
}

function createFormData(config: HarnessConfig, rng: () => number): VisitForm[] {
  const templates: Array<{ formOid: string; fieldOid: string }> = [
    { formOid: 'DM', fieldOid: 'SEX' },
    { formOid: 'DM', fieldOid: 'AGE' },
    { formOid: 'VS', fieldOid: 'SYS' },
    { formOid: 'VS', fieldOid: 'DIA' },
    { formOid: 'AE', fieldOid: 'SEVERITY' }
  ];

  const formsMap = new Map<string, Record<string, PrimitiveValue>>();

  const ensureForm = (formOid: string) => {
    if (!formsMap.has(formOid)) {
      formsMap.set(formOid, {});
    }
    return formsMap.get(formOid)!;
  };

  const totalPoints = config.formDataPointsPerVisit;

  for (let i = 0; i < totalPoints; i += 1) {
    const template =
      i < templates.length
        ? templates[i]
        : {
            formOid: 'AE',
            fieldOid: `TERM-${(i - templates.length + 1).toString().padStart(3, '0')}`
          };

    const form = ensureForm(template.formOid);
    form[template.fieldOid] = deterministicValue(rng, template.formOid, template.fieldOid);
  }

  const forms: VisitForm[] = Array.from(formsMap.entries())
    .filter(([, fields]) => Object.keys(fields).length > 0)
    .map(([formOid, data]) => ({
      formOid,
      data
    }))
    .sort((a, b) => a.formOid.localeCompare(b.formOid));

  return forms;
}

const SUBJECT_STATUS_CYCLE: SubjectStatus[] = ['Active', 'Active', 'Inactive', 'Active', 'Active', 'Deleted'];

function determineSubjectStatus(index: number): SubjectStatus {
  return SUBJECT_STATUS_CYCLE[index % SUBJECT_STATUS_CYCLE.length];
}

function createSubjects(config: HarnessConfig, rng: () => number): Subject[] {
  const subjects: Subject[] = [];
  const baseSubjectKey = 100000;
  for (let i = 0; i < config.subjectCount; i += 1) {
    const subjectKey = baseSubjectKey + i + 1;
    const visits = createVisits(config, rng);
    const siteIndex = i % config.siteCount;
    const siteLocationOid = `SITE-${(siteIndex + 1).toString().padStart(3, '0')}`;
    const subjectStatus = determineSubjectStatus(i);
    subjects.push({ subjectKey, visits, siteLocationOid, subjectStatus });
  }
  return subjects;
}

function snapshotHash(snapshot: SimulatorSnapshot): string {
  const json = JSON.stringify(snapshot);
  return crypto.createHash('sha256').update(json).digest('hex');
}

export class SimulatorState {
  private snapshot: SimulatorSnapshot | null = null;

  private simStartWallClock: number;

  private frozenDay: number | null = null;

  private config: HarnessConfig;

  private readonly now: () => number;

  constructor(config: HarnessConfig, private readonly seed = 123456, nowProvider: () => number = () => Date.now()) {
    this.config = { ...config };
    this.now = nowProvider;
    this.simStartWallClock = this.now();
  }

  private generateSnapshot(): SimulatorSnapshot {
    const rng = seededRandom(this.seed);
    return {
      sites: createSites(this.config),
      subjects: createSubjects(this.config, rng)
    };
  }

  private computeStudyDay(timeMs: number, ignoreFreeze = false): number {
    if (!ignoreFreeze && this.frozenDay !== null) {
      return this.frozenDay;
    }

    const elapsedMinutes = Math.max(0, timeMs - this.simStartWallClock) / 60000;
    const speed = this.config.simSpeedMinutesPerDay;
    if (speed <= 0) {
      return 0;
    }

    return Math.max(0, elapsedMinutes / speed);
  }

  getSnapshot(): SimulatorSnapshot {
    if (!this.snapshot) {
      this.snapshot = this.generateSnapshot();
    }
    return this.snapshot;
  }

  reset(): SimulatorSnapshot {
    this.snapshot = this.generateSnapshot();
    this.simStartWallClock = this.now();
    this.frozenDay = null;
    return this.snapshot;
  }

  getSnapshotHash(): string {
    return snapshotHash(this.getSnapshot());
  }

  getSimClock(now = this.now()): {
    simStartWallClock: number;
    simCurrentStudyDay: number;
    simSpeedMinutesPerDay: number;
  } {
    const simCurrentStudyDay = this.computeStudyDay(now);
    return {
      simStartWallClock: this.simStartWallClock,
      simCurrentStudyDay,
      simSpeedMinutesPerDay: this.config.simSpeedMinutesPerDay
    };
  }

  freeze(day = this.computeStudyDay(this.now(), true)): void {
    this.frozenDay = day;
  }

  unfreeze(): void {
    if (this.frozenDay === null) {
      return;
    }
    const referenceDay = this.frozenDay;
    this.frozenDay = null;
    const now = this.now();
    this.simStartWallClock = now - referenceDay * this.config.simSpeedMinutesPerDay * 60000;
  }

  updateSimSpeed(simSpeedMinutesPerDay: number): void {
    const now = this.now();
    const referenceDay = this.computeStudyDay(now, true);
    this.config = { ...this.config, simSpeedMinutesPerDay };
    this.simStartWallClock = now - referenceDay * simSpeedMinutesPerDay * 60000;
    if (this.frozenDay !== null) {
      this.frozenDay = referenceDay;
    }
  }

  isVisitAvailable(visit: Visit, currentDay: number): boolean {
    return Math.floor(currentDay) >= visit.availableDay;
  }

  getSubjectAvailability(currentDay = this.getSimClock().simCurrentStudyDay): SubjectAvailability[] {
    const snapshot = this.getSnapshot();
    return snapshot.subjects.map(subject => ({
      subjectKey: subject.subjectKey,
      visits: subject.visits.map(visit => ({
        visitOid: visit.visitOid,
        sequenceNumber: visit.sequenceNumber,
        availableDay: visit.availableDay,
        isAvailable: this.isVisitAvailable(visit, currentDay)
      }))
    }));
  }

  isFrozen(): boolean {
    return this.frozenDay !== null;
  }

  getFrozenDay(): number | null {
    return this.frozenDay;
  }

  setSimDay(simStudyDay: number, freeze: boolean): void {
    const safeDay = Math.max(0, simStudyDay);
    const now = this.now();
    const speed = this.config.simSpeedMinutesPerDay;
    this.simStartWallClock = now - safeDay * speed * 60000;
    this.frozenDay = freeze ? safeDay : null;
  }
}

export function hashSnapshot(snapshot: SimulatorSnapshot): string {
  return snapshotHash(snapshot);
}
