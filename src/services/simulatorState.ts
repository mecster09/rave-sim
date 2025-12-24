import crypto from 'node:crypto';
import { HarnessConfig } from './config';

interface Site {
  locationOid: string;
  name: string;
}

export interface Visit {
  visitOid: string;
  sequenceNumber: number;
  name: string;
  forms: VisitForm[];
  availableDay: number;
}

interface VisitForm {
  formOid: string;
  data: Record<string, VisitFormDataPoint>;
}

type PrimitiveValue = string | number;

export interface VisitFormDataPoint {
  valueRegular: PrimitiveValue;
  valueRaw?: PrimitiveValue;
  measurementUnitOid?: string;
}

interface Subject {
  subjectKey: number;
  siteLocationOid: string;
  subjectStatus: SubjectStatus;
  finalStatus: SubjectStatus;
  enrollmentDay: number;
  visits: Visit[];
}

export interface MetadataStudyEventFormRef {
  formOid: string;
  mandatory: 'Yes' | 'No';
  orderNumber: number;
}

export interface MetadataStudyEventDefinition {
  studyEventOid: string;
  name: string;
  orderNumber: number;
  type: string;
  formRefs: MetadataStudyEventFormRef[];
}

export interface MetadataItemDefinition {
  itemOid: string;
  name: string;
  dataType: string;
  sasFieldName: string;
  mandatory: 'Yes' | 'No';
  length?: number;
  codeListOid?: string;
}

export interface MetadataItemGroupDefinition {
  itemGroupOid: string;
  name: string;
  repeating: 'Yes' | 'No';
  items: MetadataItemDefinition[];
}

export interface MetadataFormDefinition {
  formOid: string;
  name: string;
  repeating: 'Yes' | 'No';
  description: string;
  itemGroups: MetadataItemGroupDefinition[];
}

export interface MetadataCodeListItem {
  codedValue: string;
  decode: string;
}

export interface MetadataCodeListDefinition {
  codeListOid: string;
  name: string;
  dataType: string;
  items: MetadataCodeListItem[];
}

export interface MetadataMeasurementUnitDefinition {
  measurementUnitOid: string;
  name: string;
  symbol: string;
}

export interface StudyMetadataVersion {
  metadataVersionOid: string;
  name: string;
  primaryFormOid: string;
  studyEvents: MetadataStudyEventDefinition[];
  forms: MetadataFormDefinition[];
  codeLists: MetadataCodeListDefinition[];
  measurementUnits: MetadataMeasurementUnitDefinition[];
}

export interface SimulatorSnapshot {
  sites: Site[];
  subjects: Subject[];
  versionFolders: VersionFolderMetadata[];
  metadataVersions: StudyMetadataVersion[];
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

export interface VersionFolderMetadata {
  metadataVersionOid: string;
  name: string;
  primaryFormOid: string;
  studyEvents: VersionFolderStudyEvent[];
}

export interface VersionFolderStudyEvent {
  studyEventOid: string;
  name: string;
  orderNumber: number;
  type: string;
  mandatory: 'Yes' | 'No';
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = Math.imul(1664525, state) + 1013904223;
    state >>>= 0;
    return state / 0xffffffff;
  };
}

const MONTH_ABBREVIATIONS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function formatIsoDate(year: number, month: number, day: number): string {
  return `${year.toString().padStart(4, '0')}-${(month + 1).toString().padStart(2, '0')}-${day
    .toString()
    .padStart(2, '0')}`;
}

function formatRawDate(year: number, month: number, day: number): string {
  const monthLabel = MONTH_ABBREVIATIONS[month];
  return `${day.toString().padStart(2, '0')} ${monthLabel} ${year.toString().padStart(4, '0')}`;
}

function deterministicDataPoint(rng: () => number, formOid: string, fieldOid: string): VisitFormDataPoint {
  if (formOid === 'DM') {
    if (fieldOid === 'SEX') {
      const value = rng() > 0.5 ? 'M' : 'F';
      return { valueRegular: value, valueRaw: value };
    }
    if (fieldOid === 'BRTHDTC') {
      const year = 1955 + Math.floor(rng() * 45);
      const month = Math.floor(rng() * 12);
      const day = Math.floor(rng() * 28) + 1;
      return {
        valueRegular: formatIsoDate(year, month, day),
        valueRaw: formatRawDate(year, month, day)
      };
    }
    if (fieldOid === 'AGE') {
      const age = Math.floor(rng() * 60) + 18;
      return { valueRegular: age, valueRaw: age.toString() };
    }
  }

  if (formOid === 'VS') {
    if (fieldOid === 'SYS') {
      const systolic = Math.floor(rng() * 50) + 100;
      return {
        valueRegular: systolic,
        valueRaw: `${systolic} mmHg`,
        measurementUnitOid: 'MU.MMHG'
      };
    }
    if (fieldOid === 'DIA') {
      const diastolic = Math.floor(rng() * 40) + 60;
      return {
        valueRegular: diastolic,
        valueRaw: `${diastolic} mmHg`,
        measurementUnitOid: 'MU.MMHG'
      };
    }
  }

  if (formOid === 'AE' && fieldOid === 'SEVERITY') {
    const severities = ['MILD', 'MODERATE', 'SEVERE'];
    const severity = severities[Math.floor(rng() * severities.length)];
    return { valueRegular: severity, valueRaw: severity };
  }

  const fallback = `VAL-${formOid}-${fieldOid}-${Math.floor(rng() * 1000)}`;
  return { valueRegular: fallback, valueRaw: fallback };
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

interface VisitTemplate {
  visitOid: string;
  name: string;
  sequenceNumber: number;
  availableDay: number;
}

function buildVisitTemplates(config: HarnessConfig): VisitTemplate[] {
  const templates: VisitTemplate[] = [];
  for (let i = 0; i < config.visitCountPerSubject; i += 1) {
    const sequenceNumber = i + 1;
    templates.push({
      visitOid: `VISIT-${sequenceNumber.toString().padStart(3, '0')}`,
      name: `Visit ${sequenceNumber}`,
      sequenceNumber,
      availableDay: i
    });
  }
  return templates;
}

function createVisits(config: HarnessConfig, rng: () => number): Visit[] {
  const templates = buildVisitTemplates(config);
  return templates.map(template => ({
    visitOid: template.visitOid,
    sequenceNumber: template.sequenceNumber,
    name: template.name,
    availableDay: template.availableDay,
    forms: createFormData(config, rng)
  }));
}

function createFormData(config: HarnessConfig, rng: () => number): VisitForm[] {
  const templates: Array<{ formOid: string; fieldOid: string }> = [
    { formOid: 'DM', fieldOid: 'SEX' },
    { formOid: 'DM', fieldOid: 'BRTHDTC' },
    { formOid: 'DM', fieldOid: 'AGE' },
    { formOid: 'VS', fieldOid: 'SYS' },
    { formOid: 'VS', fieldOid: 'DIA' },
    { formOid: 'AE', fieldOid: 'SEVERITY' }
  ];

  const formsMap = new Map<string, Record<string, VisitFormDataPoint>>();

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
    form[template.fieldOid] = deterministicDataPoint(rng, template.formOid, template.fieldOid);
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

function computeEnrollmentDay(index: number, config: HarnessConfig): number {
  const subjectsPerDay = Math.max(1, config.siteCount);
  return Math.floor(index / subjectsPerDay);
}

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
    const finalStatus = determineSubjectStatus(i);
    const enrollmentDay = computeEnrollmentDay(i, config);
    const subjectStatus = finalStatus;
    subjects.push({ subjectKey, visits, siteLocationOid, subjectStatus, finalStatus, enrollmentDay });
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

  private readonly auditBackfillReadyDay: number;

  constructor(config: HarnessConfig, private readonly seed = 123456, nowProvider: () => number = () => Date.now()) {
    this.config = { ...config };
    this.now = nowProvider;
    this.simStartWallClock = this.now();
    this.auditBackfillReadyDay = Math.max(1, config.visitCountPerSubject + 0.5);
  }

  private generateSnapshot(): SimulatorSnapshot {
    const rng = seededRandom(this.seed);
    const sites = createSites(this.config);
    const subjects = createSubjects(this.config, rng);
    const versionFolders = buildVersionMetadata(this.config);
    const metadataVersions = buildStudyMetadata(this.config);
    return {
      sites,
      subjects,
      versionFolders,
      metadataVersions
    };
  }

  private deriveStatus(subject: Subject, currentDay: number): SubjectStatus {
    if (subject.finalStatus === 'Deleted') {
      return 'Deleted';
    }

    if (Math.floor(currentDay) < subject.enrollmentDay) {
      return 'Inactive';
    }

    if (subject.finalStatus === 'Inactive') {
      return 'Inactive';
    }

    return 'Active';
  }

  private updateSubjectStatuses(currentDay: number): void {
    if (!this.snapshot) {
      return;
    }

    for (const subject of this.snapshot.subjects) {
      subject.subjectStatus = this.deriveStatus(subject, currentDay);
    }
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
    const currentDay = this.getSimClock().simCurrentStudyDay;
    this.updateSubjectStatuses(currentDay);
    return this.snapshot;
  }

  reset(): SimulatorSnapshot {
    this.snapshot = this.generateSnapshot();
    this.simStartWallClock = this.now();
    this.frozenDay = null;
    this.updateSubjectStatuses(0);
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
    this.updateSubjectStatuses(safeDay);
  }

  isAuditBackfillComplete(currentDay = this.getSimClock().simCurrentStudyDay): boolean {
    return currentDay >= this.auditBackfillReadyDay;
  }

  getVersionFolders(): VersionFolderMetadata[] {
    return this.getSnapshot().versionFolders;
  }

  getMetadataVersions(): StudyMetadataVersion[] {
    return this.getSnapshot().metadataVersions;
  }

  findMetadataVersion(metadataVersionOid: string): StudyMetadataVersion | undefined {
    return this.getMetadataVersions().find(version => version.metadataVersionOid === metadataVersionOid);
  }

  getPrimaryMetadataVersionOid(): string {
    const versions = this.getMetadataVersions();
    return versions.length > 0 ? versions[0].metadataVersionOid : '1';
  }
}

export function hashSnapshot(snapshot: SimulatorSnapshot): string {
  return snapshotHash(snapshot);
}

function buildVersionMetadata(config: HarnessConfig): VersionFolderMetadata[] {
  const templates = buildVisitTemplates(config);
  const primaryFormOid = 'DM';
  const studyEvents: VersionFolderStudyEvent[] = templates.map(template => ({
    studyEventOid: template.visitOid,
    name: template.name,
    orderNumber: template.sequenceNumber,
    type: 'Common',
    mandatory: 'No'
  }));

  return [
    {
      metadataVersionOid: '1',
      name: '1',
      primaryFormOid,
      studyEvents
    }
  ];
}

function buildStudyMetadata(config: HarnessConfig): StudyMetadataVersion[] {
  const visitTemplates = buildVisitTemplates(config);

  const studyEvents: MetadataStudyEventDefinition[] = visitTemplates.map(template => ({
    studyEventOid: template.visitOid,
    name: template.name,
    orderNumber: template.sequenceNumber,
    type: 'Scheduled',
    formRefs: [
      { formOid: 'DM', mandatory: 'Yes', orderNumber: 1 },
      { formOid: 'VS', mandatory: 'Yes', orderNumber: 2 },
      { formOid: 'AE', mandatory: 'No', orderNumber: 3 }
    ]
  }));

  const forms: MetadataFormDefinition[] = [
    {
      formOid: 'DM',
      name: 'Demographics',
      repeating: 'No',
      description: 'Demographics form',
      itemGroups: [
        {
          itemGroupOid: 'IG.DM',
          name: 'Demographics',
          repeating: 'No',
          items: [
            {
              itemOid: 'DM.SEX',
              name: 'Subject Sex',
              dataType: 'text',
              length: 1,
              sasFieldName: 'DMSEX',
              mandatory: 'Yes',
              codeListOid: 'CL.SEX'
            },
            {
              itemOid: 'DM.AGE',
              name: 'Subject Age',
              dataType: 'integer',
              sasFieldName: 'DMAGE',
              mandatory: 'Yes'
            }
          ]
        }
      ]
    },
    {
      formOid: 'VS',
      name: 'Vital Signs',
      repeating: 'No',
      description: 'Vital signs assessment',
      itemGroups: [
        {
          itemGroupOid: 'IG.VS',
          name: 'Vital Signs',
          repeating: 'No',
          items: [
            {
              itemOid: 'VS.SYS',
              name: 'Systolic Blood Pressure',
              dataType: 'integer',
              sasFieldName: 'VSSYS',
              mandatory: 'Yes'
            },
            {
              itemOid: 'VS.DIA',
              name: 'Diastolic Blood Pressure',
              dataType: 'integer',
              sasFieldName: 'VSDIA',
              mandatory: 'Yes'
            }
          ]
        }
      ]
    },
    {
      formOid: 'AE',
      name: 'Adverse Event Log',
      repeating: 'Yes',
      description: 'Adverse event tracking',
      itemGroups: [
        {
          itemGroupOid: 'IG.AE',
          name: 'Adverse Events',
          repeating: 'Yes',
          items: [
            {
              itemOid: 'AE.TERM',
              name: 'Preferred Term',
              dataType: 'text',
              sasFieldName: 'AETERM',
              mandatory: 'Yes'
            },
            {
              itemOid: 'AE.SEVERITY',
              name: 'Severity',
              dataType: 'text',
              sasFieldName: 'AESEV',
              mandatory: 'Yes',
              codeListOid: 'CL.SEVERITY'
            }
          ]
        }
      ]
    }
  ];

  const codeLists: MetadataCodeListDefinition[] = [
    {
      codeListOid: 'CL.SEX',
      name: 'Sex',
      dataType: 'text',
      items: [
        { codedValue: 'M', decode: 'Male' },
        { codedValue: 'F', decode: 'Female' }
      ]
    },
    {
      codeListOid: 'CL.SEVERITY',
      name: 'Severity',
      dataType: 'text',
      items: [
        { codedValue: 'MILD', decode: 'Mild' },
        { codedValue: 'MODERATE', decode: 'Moderate' },
        { codedValue: 'SEVERE', decode: 'Severe' }
      ]
    }
  ];

  const measurementUnits: MetadataMeasurementUnitDefinition[] = [
    {
      measurementUnitOid: 'MU.MMHG',
      name: 'Millimeters of Mercury',
      symbol: 'mmHg'
    }
  ];

  return [
    {
      metadataVersionOid: '1',
      name: '1',
      primaryFormOid: 'DM',
      studyEvents,
      forms,
      codeLists,
      measurementUnits
    }
  ];
}
