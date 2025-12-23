import { describe, expect, it } from 'vitest';
import { DOMParser } from '@xmldom/xmldom';
import {
  buildSnapshotODM,
  buildTransactionalODM,
  buildVersionFoldersODM,
  BuildSnapshotOptions,
  BuildTransactionalOptions,
  BuildVersionFoldersOptions
} from '../../src/services/odmBuilder';

function hasParserError(xml: string): boolean {
  const parser = new DOMParser();
  try {
    const doc = parser.parseFromString(xml, 'application/xml');
    const errors = doc.getElementsByTagName('parsererror');
    return errors.length > 0;
  } catch {
    return true;
  }
}

describe('odmBuilder', () => {
  const snapshotOptions: BuildSnapshotOptions = {
    studyOid: 'STUDY1',
    metadataVersionOid: 'MDV1',
    generatedAt: '2025-01-01T00:00:00Z',
    truncate: false,
    subjects: [
      {
        subjectKey: 'SUB-002',
        siteLocationOid: 'SITE-002',
        subjectStatus: 'Completed',
        visits: [
          {
            visitOid: 'VISIT-2',
            forms: [
              {
                formOid: 'FORM-B',
                data: {
                  FIELD2: 'value2',
                  FIELD1: 'value1'
                }
              }
            ]
          }
        ]
      },
      {
        subjectKey: 'SUB-001',
        siteLocationOid: 'SITE-001',
        visits: [
          {
            visitOid: 'VISIT-1',
            forms: [
              {
                formOid: 'FORM-A',
                data: {
                  FIELD1: 'alpha',
                  FIELD2: 123
                }
              }
            ]
          }
        ]
      }
    ]
  };

  const transactionalOptions: BuildTransactionalOptions = {
    studyOid: 'STUDY1',
    metadataVersionOid: 'MDV1',
    generatedAt: '2025-12-23T14:02:17.981Z',
    truncate: false,
    entries: [
      {
        id: 'AUD-002',
        userOid: 'user-b',
        dateTimeStamp: '2025-01-02T12:00:00Z',
        reason: 'update',
        values: {
          FIELD2: 'v2',
          FIELD1: 'v1'
        }
      },
      {
        id: 'AUD-001',
        userOid: 'user-a',
        dateTimeStamp: '2025-01-01T12:00:00Z',
        values: {
          FIELD3: 'v3'
        }
      }
    ]
  };

  const versionFoldersOptions: BuildVersionFoldersOptions = {
    studyOid: 'ExampleStudy(Prod)',
    generatedAt: '2025-12-23T15:00:00Z',
    truncate: false,
    versions: [
      {
        metadataVersionOid: 'MDV.VERSION-2',
        name: '2',
        primaryFormOid: 'VS',
        studyEvents: [
          {
            studyEventOid: 'VISIT-002',
            name: 'Visit 2',
            orderNumber: 2,
            type: 'Common',
            mandatory: 'No'
          },
          {
            studyEventOid: 'VISIT-001',
            name: 'Visit 1',
            orderNumber: 1,
            type: 'Common',
            mandatory: 'Yes'
          }
        ]
      }
    ]
  };

  it('produces parseable snapshot and transactional ODM XML', () => {
    const snapshotXml = buildSnapshotODM(snapshotOptions);
    const transactionalXml = buildTransactionalODM(transactionalOptions);

    expect(hasParserError(snapshotXml)).toBe(false);
    expect(hasParserError(transactionalXml)).toBe(false);
  });

  it('maintains stable ordering regardless of input order', () => {
    const shuffledSnapshot = buildSnapshotODM({
      ...snapshotOptions,
      subjects: [...snapshotOptions.subjects].reverse()
    });
    const orderedSnapshot = buildSnapshotODM(snapshotOptions);

    expect(shuffledSnapshot).toBe(orderedSnapshot);

    const shuffledTransactional = buildTransactionalODM({
      ...transactionalOptions,
      entries: [...transactionalOptions.entries].reverse()
    });
    const orderedTransactional = buildTransactionalODM(transactionalOptions);

    expect(shuffledTransactional).toBe(orderedTransactional);
  });

  it('returns invalid XML when truncation enabled', () => {
    const truncated = buildSnapshotODM({ ...snapshotOptions, truncate: true });
    expect(truncated.endsWith('</ODM>')).toBe(false);
    expect(hasParserError(truncated)).toBe(true);
  });

  it('builds VersionFolders ODM deterministically', () => {
    const xml = buildVersionFoldersODM(versionFoldersOptions);
    expect(hasParserError(xml)).toBe(false);
    expect(xml).toContain('<StudyName>ExampleStudy(Prod)</StudyName>');
    expect(xml).toContain('<StudyEventRef StudyEventOID="VISIT-001" OrderNumber="1"');
    expect(xml).toContain('<StudyEventDef OID="VISIT-002"');

    const shuffled = buildVersionFoldersODM({
      ...versionFoldersOptions,
      versions: [...versionFoldersOptions.versions].map(version => ({
        ...version,
        studyEvents: [...version.studyEvents].reverse()
      }))
    });

    expect(shuffled).toBe(xml);
  });

  it('omits closing ODM when VersionFolders truncation enabled', () => {
    const truncated = buildVersionFoldersODM({ ...versionFoldersOptions, truncate: true });
    expect(truncated.trim().endsWith('</ODM>')).toBe(false);
  });
});
