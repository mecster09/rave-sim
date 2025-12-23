import crypto from 'node:crypto';

type Primitive = string | number | boolean;

export interface SnapshotForm {
  formOid: string;
  data: Record<string, Primitive>;
}

export interface SnapshotVisit {
  visitOid: string;
  forms: SnapshotForm[];
}

export interface SnapshotSubject {
  subjectKey: string;
  siteLocationOid: string;
  subjectStatus?: string;
  visits: SnapshotVisit[];
}

export interface BuildSnapshotOptions {
  studyOid: string;
  metadataVersionOid: string;
  generatedAt: string;
  subjects: SnapshotSubject[];
  truncate?: boolean;
}

export interface AuditRecord {
  id: string;
  userOid: string;
  dateTimeStamp: string;
  reason?: string;
  values: Record<string, Primitive>;
}

export interface BuildTransactionalOptions {
  studyOid: string;
  metadataVersionOid: string;
  entries: AuditRecord[];
  truncate?: boolean;
}

const ODM_NAMESPACE = 'http://www.cdisc.org/ns/odm/v1.3';
const MDSOL_NAMESPACE = 'http://www.mdsol.com/ns/odm/metadata';

export function buildSnapshotODM(options: BuildSnapshotOptions): string {
  const { studyOid, metadataVersionOid, generatedAt, subjects, truncate } = options;
  const lines: string[] = [];

  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push(
    `<ODM FileOID="${escapeAttribute(hashSubjects(subjects))}" FileType="Snapshot" ODMVersion="1.3.2" CreationDateTime="${escapeAttribute(
      generatedAt
    )}" xmlns="${ODM_NAMESPACE}" xmlns:mdsol="${MDSOL_NAMESPACE}">`
  );
  lines.push(`  <ClinicalData StudyOID="${escapeAttribute(studyOid)}" MetaDataVersionOID="${escapeAttribute(metadataVersionOid)}">`);

  const sortedSubjects = [...subjects].sort((a, b) => a.subjectKey.localeCompare(b.subjectKey));

  for (const subject of sortedSubjects) {
    lines.push(
      `    <SubjectData SubjectKey="${escapeAttribute(subject.subjectKey)}" mdsol:SubjectStatus="${escapeAttribute(
        subject.subjectStatus ?? 'Active'
      )}">`
    );
    lines.push(`      <SiteRef LocationOID="${escapeAttribute(subject.siteLocationOid)}"/>`);

    const sortedVisits = [...subject.visits].sort((a, b) => a.visitOid.localeCompare(b.visitOid));

    for (const visit of sortedVisits) {
      lines.push(`      <StudyEventData StudyEventOID="${escapeAttribute(visit.visitOid)}">`);
      const sortedForms = [...visit.forms].sort((a, b) => a.formOid.localeCompare(b.formOid));

      for (const form of sortedForms) {
        lines.push(`        <FormData FormOID="${escapeAttribute(form.formOid)}">`);
        const itemDataKeys = Object.keys(form.data).sort();
        for (const key of itemDataKeys) {
          const value = form.data[key];
          lines.push(`          <ItemData ItemOID="${escapeAttribute(key)}" Value="${escapeAttribute(String(value))}"/>`);
        }
        lines.push('        </FormData>');
      }

      lines.push('      </StudyEventData>');
    }

    lines.push('    </SubjectData>');
  }

  lines.push('  </ClinicalData>');
  if (!truncate) {
    lines.push('</ODM>');
  }

  return lines.join('\n');
}

export function buildTransactionalODM(options: BuildTransactionalOptions): string {
  const { studyOid, metadataVersionOid, entries, truncate } = options;
  const lines: string[] = [];

  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push(
    `<ODM FileOID="${escapeAttribute(hashAuditRecords(entries))}" FileType="Transactional" ODMVersion="1.3.2" CreationDateTime="${escapeAttribute(
      new Date().toISOString()
    )}" xmlns="${ODM_NAMESPACE}" xmlns:mdsol="${MDSOL_NAMESPACE}">`
  );
  lines.push(`  <ClinicalData StudyOID="${escapeAttribute(studyOid)}" MetaDataVersionOID="${escapeAttribute(metadataVersionOid)}">`);
  lines.push('    <AuditRecords>');

  const sortedEntries = [...entries].sort((a, b) => a.id.localeCompare(b.id));

  for (const entry of sortedEntries) {
    lines.push(
      `      <AuditRecord AuditRecordID="${escapeAttribute(entry.id)}" UserOID="${escapeAttribute(entry.userOid)}" DateTimeStamp="${escapeAttribute(
        entry.dateTimeStamp
      )}">`
    );
    if (entry.reason) {
      lines.push(`        <ReasonForChange>${escapeText(entry.reason)}</ReasonForChange>`);
    }
    lines.push('        <mdsol:Values>');
    const valueKeys = Object.keys(entry.values).sort();
    for (const key of valueKeys) {
      lines.push(
        `          <mdsol:Value ItemOID="${escapeAttribute(key)}" Value="${escapeAttribute(String(entry.values[key]))}"/>`
      );
    }
    lines.push('        </mdsol:Values>');
    lines.push('      </AuditRecord>');
  }

  lines.push('    </AuditRecords>');
  lines.push('  </ClinicalData>');
  if (!truncate) {
    lines.push('</ODM>');
  }

  return lines.join('\n');
}

function hashSubjects(subjects: SnapshotSubject[]): string {
  const hash = crypto.createHash('sha256');
  const normalized = subjects
    .map(subject => ({
      subjectKey: subject.subjectKey,
      siteLocationOid: subject.siteLocationOid,
      subjectStatus: subject.subjectStatus ?? 'Active',
      visits: subject.visits
        .map(visit => ({
          visitOid: visit.visitOid,
          forms: visit.forms
            .map(form => ({
              formOid: form.formOid,
              data: Object.keys(form.data)
                .sort()
                .map(key => [key, String(form.data[key])])
            }))
            .sort((a, b) => a.formOid.localeCompare(b.formOid))
        }))
        .sort((a, b) => a.visitOid.localeCompare(b.visitOid))
    }))
    .sort((a, b) => a.subjectKey.localeCompare(b.subjectKey));

  hash.update(JSON.stringify(normalized));
  return hash.digest('hex');
}

function hashAuditRecords(entries: AuditRecord[]): string {
  const hash = crypto.createHash('sha256');
  const normalized = entries
    .map(entry => ({
      id: entry.id,
      userOid: entry.userOid,
      dateTimeStamp: entry.dateTimeStamp,
      reason: entry.reason ?? '',
      values: Object.keys(entry.values)
        .sort()
        .map(key => [key, String(entry.values[key])])
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  hash.update(JSON.stringify(normalized));
  return hash.digest('hex');
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
