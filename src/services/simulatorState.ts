import crypto from 'node:crypto';
import { HarnessConfig } from './config';

interface Site {
  locationOid: string;
  name: string;
}

interface Visit {
  visitOid: string;
  sequenceNumber: number;
  forms: FormDataPoint[];
}

interface FormDataPoint {
  formOid: string;
  fieldOid: string;
  value: string | number;
}

interface Subject {
  subjectKey: number;
  visits: Visit[];
}

export interface SimulatorSnapshot {
  sites: Site[];
  subjects: Subject[];
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
      forms
    });
  }
  return visits;
}

function createFormData(config: HarnessConfig, rng: () => number): FormDataPoint[] {
  const templates: Array<{ formOid: string; fieldOid: string }> = [
    { formOid: 'DM', fieldOid: 'SEX' },
    { formOid: 'DM', fieldOid: 'AGE' },
    { formOid: 'VS', fieldOid: 'SYS' },
    { formOid: 'VS', fieldOid: 'DIA' },
    { formOid: 'AE', fieldOid: 'SEVERITY' }
  ];

  const datapoints: FormDataPoint[] = [];
  for (let i = 0; i < config.formDataPointsPerVisit; i += 1) {
    const template =
      i < templates.length
        ? templates[i]
        : {
            formOid: 'AE',
            fieldOid: `TERM-${(i - templates.length + 1).toString().padStart(3, '0')}`
          };
    datapoints.push({
      formOid: template.formOid,
      fieldOid: template.fieldOid,
      value: deterministicValue(rng, template.formOid, template.fieldOid)
    });
  }
  return datapoints;
}

function createSubjects(config: HarnessConfig, rng: () => number): Subject[] {
  const subjects: Subject[] = [];
  const baseSubjectKey = 100000;
  for (let i = 0; i < config.subjectCount; i += 1) {
    const subjectKey = baseSubjectKey + i + 1;
    const visits = createVisits(config, rng);
    subjects.push({ subjectKey, visits });
  }
  return subjects;
}

function snapshotHash(snapshot: SimulatorSnapshot): string {
  const json = JSON.stringify(snapshot);
  return crypto.createHash('sha256').update(json).digest('hex');
}

export class SimulatorState {
  private snapshot: SimulatorSnapshot | null = null;

  constructor(private readonly config: HarnessConfig, private readonly seed = 123456) {}

  private generateSnapshot(): SimulatorSnapshot {
    const rng = seededRandom(this.seed);
    return {
      sites: createSites(this.config),
      subjects: createSubjects(this.config, rng)
    };
  }

  getSnapshot(): SimulatorSnapshot {
    if (!this.snapshot) {
      this.snapshot = this.generateSnapshot();
    }
    return this.snapshot;
  }

  reset(): SimulatorSnapshot {
    this.snapshot = this.generateSnapshot();
    return this.snapshot;
  }

  getSnapshotHash(): string {
    return snapshotHash(this.getSnapshot());
  }
}

export function hashSnapshot(snapshot: SimulatorSnapshot): string {
  return snapshotHash(snapshot);
}
