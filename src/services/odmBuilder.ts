import crypto from 'node:crypto';
import type { StudyMetadataVersion } from './simulatorState';

type Primitive = string | number | boolean;

export interface SnapshotItemData {
  itemOid: string;
  value: Primitive;
  measurementUnitOid?: string;
}

export interface SnapshotForm {
  formOid: string;
  items: SnapshotItemData[];
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

export interface BuildStudyMetadataOptions {
  studyOid: string;
  generatedAt: string;
  metadata: StudyMetadataVersion;
  studyDescription?: string;
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
        const sortedItems = [...form.items].sort((a, b) => a.itemOid.localeCompare(b.itemOid));
        for (const item of sortedItems) {
          const measurementAttr =
            item.measurementUnitOid !== undefined
              ? ` MeasurementUnitOID="${escapeAttribute(item.measurementUnitOid)}"`
              : '';
          lines.push(
            `          <ItemData ItemOID="${escapeAttribute(item.itemOid)}"${measurementAttr} Value="${escapeAttribute(String(item.value))}"/>`
          );
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

export function buildStudyMetadataODM(options: BuildStudyMetadataOptions): string {
  const { studyOid, generatedAt, metadata, studyDescription, truncate } = options;
  const lines: string[] = [];
  const protocolName = deriveProtocolName(studyOid);
  const description = studyDescription ?? 'Harness Metadata Snapshot';

  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push(
    `<ODM FileOID="${escapeAttribute(hashStudyMetadata(metadata))}" FileType="Snapshot" ODMVersion="1.3.2" CreationDateTime="${escapeAttribute(
      generatedAt
    )}" xmlns="${ODM_NAMESPACE}" xmlns:mdsol="${MDSOL_NAMESPACE}">`
  );
  lines.push(`  <Study OID="${escapeAttribute(studyOid)}">`);
  lines.push('    <GlobalVariables>');
  lines.push(`      <StudyName>${escapeText(studyOid)}</StudyName>`);
  lines.push(`      <StudyDescription>${escapeText(description)}</StudyDescription>`);
  lines.push(`      <ProtocolName>${escapeText(protocolName)}</ProtocolName>`);
  lines.push('    </GlobalVariables>');
  if (metadata.measurementUnits.length > 0) {
    lines.push('    <BasicDefinitions>');
    const sortedUnits = [...metadata.measurementUnits].sort((a, b) =>
      a.measurementUnitOid.localeCompare(b.measurementUnitOid)
    );
    for (const unit of sortedUnits) {
      lines.push(
        `      <MeasurementUnit OID="${escapeAttribute(unit.measurementUnitOid)}" Name="${escapeAttribute(unit.name)}">`
      );
      lines.push('        <Symbol>');
      lines.push(`          <TranslatedText xml:lang="en">${escapeText(unit.symbol)}</TranslatedText>`);
      lines.push('        </Symbol>');
      lines.push('      </MeasurementUnit>');
    }
    lines.push('    </BasicDefinitions>');
  }
  lines.push(
    `    <MetaDataVersion OID="${escapeAttribute(metadata.metadataVersionOid)}" Name="${escapeAttribute(metadata.name)}" mdsol:PrimaryFormOID="${escapeAttribute(
      metadata.primaryFormOid
    )}">`
  );
  lines.push('      <Protocol>');

  const orderedEventRefs = [...metadata.studyEvents].sort((a, b) => {
    if (a.orderNumber === b.orderNumber) {
      return a.studyEventOid.localeCompare(b.studyEventOid);
    }
    return a.orderNumber - b.orderNumber;
  });

  for (const event of orderedEventRefs) {
    lines.push(
      `        <StudyEventRef StudyEventOID="${escapeAttribute(event.studyEventOid)}" OrderNumber="${escapeAttribute(String(
        event.orderNumber
      ))}" Mandatory="${escapeAttribute(event.formRefs.some(ref => ref.mandatory === 'Yes') ? 'Yes' : 'No')}" mdsol:StudyEventDefName="${escapeAttribute(
        event.name
      )}"/>`
    );
  }

  lines.push('      </Protocol>');

  const sortedEvents = [...metadata.studyEvents].sort((a, b) => a.studyEventOid.localeCompare(b.studyEventOid));
  for (const event of sortedEvents) {
    lines.push(
      `      <StudyEventDef OID="${escapeAttribute(event.studyEventOid)}" Name="${escapeAttribute(event.name)}" Repeating="No" Type="${escapeAttribute(
        event.type
      )}">`
    );
    const orderedFormRefs = [...event.formRefs].sort((a, b) => {
      if (a.orderNumber === b.orderNumber) {
        return a.formOid.localeCompare(b.formOid);
      }
      return a.orderNumber - b.orderNumber;
    });
    for (const formRef of orderedFormRefs) {
      lines.push(
        `        <FormRef FormOID="${escapeAttribute(formRef.formOid)}" Mandatory="${escapeAttribute(formRef.mandatory)}" OrderNumber="${escapeAttribute(
          String(formRef.orderNumber)
        )}"/>`
      );
    }
    lines.push('      </StudyEventDef>');
  }

  const sortedForms = [...metadata.forms].sort((a, b) => a.formOid.localeCompare(b.formOid));
  for (const form of sortedForms) {
    lines.push(
      `      <FormDef OID="${escapeAttribute(form.formOid)}" Name="${escapeAttribute(form.name)}" Repeating="${escapeAttribute(form.repeating)}">`
    );
    lines.push('        <Description>');
    lines.push(`          <TranslatedText xml:lang="en">${escapeText(form.description)}</TranslatedText>`);
    lines.push('        </Description>');
    const sortedItemGroups = [...form.itemGroups].sort((a, b) => a.itemGroupOid.localeCompare(b.itemGroupOid));
    let orderNumber = 1;
    for (const itemGroup of sortedItemGroups) {
      lines.push(
        `        <ItemGroupRef ItemGroupOID="${escapeAttribute(itemGroup.itemGroupOid)}" Mandatory="Yes" OrderNumber="${escapeAttribute(String(
          orderNumber
        ))}"/>`
      );
      orderNumber += 1;
    }
    lines.push('      </FormDef>');
  }

  const allItemGroups = sortedForms.flatMap(form => form.itemGroups);
  const sortedGroups = [...allItemGroups].sort((a, b) => a.itemGroupOid.localeCompare(b.itemGroupOid));
  for (const group of sortedGroups) {
    lines.push(
      `      <ItemGroupDef OID="${escapeAttribute(group.itemGroupOid)}" Name="${escapeAttribute(group.name)}" Repeating="${escapeAttribute(
        group.repeating
      )}">`
    );
    const sortedItems = [...group.items].sort((a, b) => a.itemOid.localeCompare(b.itemOid));
    let itemOrder = 1;
    for (const item of sortedItems) {
      lines.push(
        `        <ItemRef ItemOID="${escapeAttribute(item.itemOid)}" Mandatory="${escapeAttribute(item.mandatory)}" OrderNumber="${escapeAttribute(
          String(itemOrder)
        )}"/>`
      );
      itemOrder += 1;
    }
    lines.push('      </ItemGroupDef>');
  }

  const uniqueItems = sortedGroups.flatMap(group => group.items);
  const sortedUniqueItems = [...uniqueItems].sort((a, b) => a.itemOid.localeCompare(b.itemOid));
  for (const item of sortedUniqueItems) {
    lines.push(
      `      <ItemDef OID="${escapeAttribute(item.itemOid)}" Name="${escapeAttribute(item.name)}" DataType="${escapeAttribute(item.dataType)}"${
        item.length !== undefined ? ` Length="${escapeAttribute(String(item.length))}"` : ''
      }>`
    );
    lines.push('        <Question>');
    lines.push(`          <TranslatedText xml:lang="en">${escapeText(item.name)}</TranslatedText>`);
    lines.push('        </Question>');
    if (item.codeListOid) {
      lines.push(`        <CodeListRef CodeListOID="${escapeAttribute(item.codeListOid)}"/>`);
    }
    lines.push(`        <mdsol:SASFieldName>${escapeText(item.sasFieldName)}</mdsol:SASFieldName>`);
    lines.push('      </ItemDef>');
  }

  const sortedCodeLists = [...metadata.codeLists].sort((a, b) => a.codeListOid.localeCompare(b.codeListOid));
  for (const codeList of sortedCodeLists) {
    lines.push(
      `      <CodeList OID="${escapeAttribute(codeList.codeListOid)}" Name="${escapeAttribute(codeList.name)}" DataType="${escapeAttribute(
        codeList.dataType
      )}">`
    );
    const sortedItems = [...codeList.items].sort((a, b) => a.codedValue.localeCompare(b.codedValue));
    for (const listItem of sortedItems) {
      lines.push(`        <CodeListItem CodedValue="${escapeAttribute(listItem.codedValue)}">`);
      lines.push(`          <Decode><TranslatedText xml:lang="en">${escapeText(listItem.decode)}</TranslatedText></Decode>`);
      lines.push('        </CodeListItem>');
    }
    lines.push('      </CodeList>');
  }

  lines.push('    </MetaDataVersion>');
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

function hashStudyMetadata(metadata: StudyMetadataVersion): string {
  const hash = crypto.createHash('sha256');
  const normalized = {
    metadataVersionOid: metadata.metadataVersionOid,
    name: metadata.name,
    primaryFormOid: metadata.primaryFormOid,
    studyEvents: metadata.studyEvents
      .map(event => ({
        studyEventOid: event.studyEventOid,
        name: event.name,
        orderNumber: event.orderNumber,
        type: event.type,
        formRefs: [...event.formRefs]
          .map(ref => ({
            formOid: ref.formOid,
            mandatory: ref.mandatory,
            orderNumber: ref.orderNumber
          }))
          .sort((a, b) =>
            a.orderNumber === b.orderNumber ? a.formOid.localeCompare(b.formOid) : a.orderNumber - b.orderNumber
          )
      }))
      .sort((a, b) =>
        a.orderNumber === b.orderNumber ? a.studyEventOid.localeCompare(b.studyEventOid) : a.orderNumber - b.orderNumber
      ),
    forms: metadata.forms
      .map(form => ({
        formOid: form.formOid,
        name: form.name,
        repeating: form.repeating,
        description: form.description,
        itemGroups: form.itemGroups
          .map(group => ({
            itemGroupOid: group.itemGroupOid,
            name: group.name,
            repeating: group.repeating,
            items: group.items
              .map(item => ({
                itemOid: item.itemOid,
                name: item.name,
                dataType: item.dataType,
                sasFieldName: item.sasFieldName,
                mandatory: item.mandatory,
                length: item.length ?? null,
                codeListOid: item.codeListOid ?? null
              }))
              .sort((a, b) => a.itemOid.localeCompare(b.itemOid))
          }))
          .sort((a, b) => a.itemGroupOid.localeCompare(b.itemGroupOid))
      }))
      .sort((a, b) => a.formOid.localeCompare(b.formOid)),
    codeLists: metadata.codeLists
      .map(codeList => ({
        codeListOid: codeList.codeListOid,
        name: codeList.name,
        dataType: codeList.dataType,
        items: codeList.items
          .map(item => ({
            codedValue: item.codedValue,
            decode: item.decode
          }))
          .sort((a, b) => a.codedValue.localeCompare(b.codedValue))
      }))
      .sort((a, b) => a.codeListOid.localeCompare(b.codeListOid)),
    measurementUnits: metadata.measurementUnits
      .map(unit => ({
        measurementUnitOid: unit.measurementUnitOid,
        name: unit.name,
        symbol: unit.symbol
      }))
      .sort((a, b) => a.measurementUnitOid.localeCompare(b.measurementUnitOid))
  };
  hash.update(JSON.stringify(normalized));
  return hash.digest('hex');
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
              items: form.items
                .map(item => [item.itemOid, String(item.value), item.measurementUnitOid ?? ''])
                .sort((a, b) => a[0].localeCompare(b[0]))
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
