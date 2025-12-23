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
  generatedAt?: string;
  truncate?: boolean;
}

export interface BuildOdmErrorOptions {
  studyOid: string;
  metadataVersionOid: string;
  code: string;
  message: string;
  generatedAt?: string;
}

export interface VersionFolderStudyEventDefinition {
  studyEventOid: string;
  name: string;
  orderNumber: number;
  type: string;
  mandatory: 'Yes' | 'No';
}

export interface VersionFolderDefinition {
  metadataVersionOid: string;
  name: string;
  primaryFormOid: string;
  studyEvents: VersionFolderStudyEventDefinition[];
}

export interface BuildVersionFoldersOptions {
  studyOid: string;
  generatedAt: string;
  versions: VersionFolderDefinition[];
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

export function buildVersionFoldersODM(options: BuildVersionFoldersOptions): string {
  const { studyOid, generatedAt, versions, truncate } = options;
  const lines: string[] = [];
  const protocolName = deriveProtocolName(studyOid);

  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push(
    `<ODM FileOID="${escapeAttribute(hashVersionFolders(versions))}" FileType="Snapshot" ODMVersion="1.3.1" CreationDateTime="${escapeAttribute(
      generatedAt
    )}" xmlns="${ODM_NAMESPACE}" xmlns:mdsol="${MDSOL_NAMESPACE}">`
  );
  lines.push(`  <Study OID="${escapeAttribute(studyOid)}">`);
  lines.push('    <GlobalVariables>');
  lines.push(`      <StudyName>${escapeText(studyOid)}</StudyName>`);
  lines.push(`      <ProtocolName>${escapeText(protocolName)}</ProtocolName>`);
  lines.push('    </GlobalVariables>');

  const sortedVersions = [...versions].sort((a, b) =>
    a.metadataVersionOid.localeCompare(b.metadataVersionOid)
  );

  for (const version of sortedVersions) {
    lines.push(
      `    <MetaDataVersion OID="${escapeAttribute(version.metadataVersionOid)}" Name="${escapeAttribute(version.name)}" mdsol:PrimaryFormOID="${escapeAttribute(
        version.primaryFormOid
      )}">`
    );
    lines.push('      <Protocol>');

    const sortedRefs = [...version.studyEvents].sort((a, b) => a.orderNumber - b.orderNumber);
    for (const event of sortedRefs) {
      lines.push(
        `        <StudyEventRef StudyEventOID="${escapeAttribute(event.studyEventOid)}" OrderNumber="${escapeAttribute(
          String(event.orderNumber)
        )}" Mandatory="${escapeAttribute(event.mandatory)}" mdsol:StudyEventDefName="${escapeAttribute(event.name)}"/>`
      );
    }

    lines.push('      </Protocol>');

    const sortedEvents = [...version.studyEvents].sort((a, b) =>
      a.studyEventOid.localeCompare(b.studyEventOid)
    );

    for (const event of sortedEvents) {
      lines.push(
        `      <StudyEventDef OID="${escapeAttribute(event.studyEventOid)}" Name="${escapeAttribute(event.name)}" Repeating="No" Type="${escapeAttribute(
          event.type
        )}"/>`
      );
    }

    lines.push('    </MetaDataVersion>');
  }

  lines.push('  </Study>');

  if (!truncate) {
    lines.push('</ODM>');
  }

  return lines.join('\n');
}

export function buildTransactionalODM(options: BuildTransactionalOptions): string {
  const { studyOid, metadataVersionOid, entries, generatedAt, truncate } = options;
  const lines: string[] = [];

  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push(
    `<ODM FileOID="${escapeAttribute(hashAuditRecords(entries))}" FileType="Transactional" ODMVersion="1.3.2" CreationDateTime="${escapeAttribute(
      generatedAt ?? new Date().toISOString()
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

export function buildOdmError(options: BuildOdmErrorOptions): string {
  const { studyOid, metadataVersionOid, code, message, generatedAt } = options;
  const lines: string[] = [];

  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push(
    `<ODM FileOID="${escapeAttribute(hashErrorPayload(code, message))}" FileType="Transactional" ODMVersion="1.3.2" CreationDateTime="${escapeAttribute(
      generatedAt ?? new Date().toISOString()
    )}" xmlns="${ODM_NAMESPACE}" xmlns:mdsol="${MDSOL_NAMESPACE}">`
  );
  lines.push(`  <ClinicalData StudyOID="${escapeAttribute(studyOid)}" MetaDataVersionOID="${escapeAttribute(metadataVersionOid)}">`);
  lines.push('    <mdsol:Errors>');
  lines.push(`      <mdsol:Error Code="${escapeAttribute(code)}">${escapeText(message)}</mdsol:Error>`);
  lines.push('    </mdsol:Errors>');
  lines.push('  </ClinicalData>');
  lines.push('</ODM>');

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

function hashVersionFolders(versions: VersionFolderDefinition[]): string {
  const hash = crypto.createHash('sha256');
  const normalized = versions
    .map(version => ({
      metadataVersionOid: version.metadataVersionOid,
      name: version.name,
      primaryFormOid: version.primaryFormOid,
      events: version.studyEvents
        .map(event => ({
          studyEventOid: event.studyEventOid,
          name: event.name,
          orderNumber: event.orderNumber,
          type: event.type,
          mandatory: event.mandatory
        }))
        .sort((a, b) => a.studyEventOid.localeCompare(b.studyEventOid))
    }))
    .sort((a, b) => a.metadataVersionOid.localeCompare(b.metadataVersionOid));

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

function hashErrorPayload(code: string, message: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(`${code}|${message}`);
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

function deriveProtocolName(studyOid: string): string {
  const parenIndex = studyOid.indexOf('(');
  if (parenIndex === -1) {
    return studyOid;
  }
  const prefix = studyOid.slice(0, parenIndex).trim();
  return prefix.length > 0 ? prefix : studyOid;
}
