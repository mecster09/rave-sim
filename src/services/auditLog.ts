import { SimulatorSnapshot, SimulatorState } from './simulatorState';
import { AuditRecord } from './odmBuilder';

export interface AuditLogOptions {
  studyOid: string;
  metadataVersionOid: string;
  unicode: boolean;
  mode: 'default' | 'enhanced' | 'all';
  startId: string;
  pageSize: number;
  backfillComplete: boolean;
}

interface RawAuditRecord {
  id: string;
  subjectKey: string;
  visitOid: string;
  formOid: string;
  itemOid: string;
  userOid: string;
  dateTimeStamp: string;
  value: string;
  reason?: string;
}

const BASE_USERS = ['system', 'investigator', 'coordinator'];

function flattenSnapshot(snapshot: SimulatorSnapshot): RawAuditRecord[] {
  const records: RawAuditRecord[] = [];

  for (const subject of snapshot.subjects) {
    for (const visit of subject.visits) {
      for (const form of visit.forms) {
        const itemOids = Object.keys(form.data).sort();
        for (const itemOid of itemOids) {
          const dataPoint = form.data[itemOid];
          const valueSource = dataPoint.valueRegular;
          const value = typeof valueSource === 'string' ? valueSource : String(valueSource);
          const hashSource = `${subject.subjectKey}|${visit.visitOid}|${form.formOid}|${itemOid}|${value}`;
          const id = createDeterministicId(hashSource);
          records.push({
            id,
            subjectKey: String(subject.subjectKey),
            visitOid: visit.visitOid,
            formOid: form.formOid,
            itemOid,
            userOid: pickUser(hashSource),
            dateTimeStamp: buildTimestamp(hashSource),
            value,
            reason: needsReason(hashSource) ? 'Data entry' : undefined
          });
        }
      }
    }
  }

  return records.sort((a, b) => a.id.localeCompare(b.id));
}

function createDeterministicId(source: string): string {
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function pickUser(source: string): string {
  const index = Math.abs(hashString(source)) % BASE_USERS.length;
  return BASE_USERS[index];
}

function buildTimestamp(source: string): string {
  const seed = Math.abs(hashString(source));
  const year = 2020 + (seed % 5);
  const month = ((seed >> 3) % 12) + 1;
  const day = ((seed >> 5) % 28) + 1;
  const hour = ((seed >> 7) % 24);
  const minute = ((seed >> 9) % 60);
  const second = ((seed >> 11) % 60);
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day
    .toString()
    .padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second
    .toString()
    .padStart(2, '0')}Z`;
}

function needsReason(source: string): boolean {
  return (hashString(source) & 0x1) === 0;
}

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return hash;
}

export function buildAuditPage(state: SimulatorState, options: AuditLogOptions): {
  auditRecords: AuditRecord[];
  nextId: string | null;
  totalRecords: number;
} {
  const snapshot = state.getSnapshot();
  const rawRecords = flattenSnapshot(snapshot);

  let filtered = rawRecords;

  if ((options.mode === 'enhanced' || options.mode === 'all') && !options.backfillComplete) {
    return {
      auditRecords: [],
      nextId: null,
      totalRecords: 0
    };
  }

  if (options.startId) {
    const index = filtered.findIndex(record => record.id === options.startId);
    if (index !== -1) {
      filtered = filtered.slice(index + 1);
    }
  }

  const page = filtered.slice(0, options.pageSize);
  const next = filtered.length > options.pageSize ? filtered[options.pageSize].id : null;

  const auditRecords = page.map(record => ({
    id: record.id,
    userOid: buildUserOid(record, options.unicode),
    dateTimeStamp: record.dateTimeStamp,
    reason: record.reason,
    values: buildValues(record)
  }));

  return {
    auditRecords,
    nextId: next,
    totalRecords: filtered.length
  };
}

function buildUserOid(record: RawAuditRecord, unicode: boolean): string {
  if (!unicode) {
    return record.userOid;
  }
  const suffix = '–ユニコード';
  return `${record.userOid}${suffix}`;
}

function buildValues(record: RawAuditRecord): Record<string, string> {
  return {
    SUBJECT: record.subjectKey,
    VISIT: record.visitOid,
    FORM: record.formOid,
    ITEM: record.itemOid,
    VALUE: record.value
  };
}
