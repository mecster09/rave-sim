import { describe, expect, it } from 'vitest';
import { buildClinicalViewSubjects } from '../../src/services/clinicalViewBuilder';
import { SimulatorSnapshot } from '../../src/services/simulatorState';

describe('buildClinicalViewSubjects', () => {
  const snapshot: SimulatorSnapshot = {
    sites: [
      {
        locationOid: 'SITE-001',
        name: 'Site 1'
      }
    ],
    subjects: [
      {
        subjectKey: 100001,
        siteLocationOid: 'SITE-001',
        subjectStatus: 'Active',
        visits: [
          {
            visitOid: 'VISIT-001',
            sequenceNumber: 1,
            availableDay: 0,
            forms: [
              {
                formOid: 'DM',
                data: {
                  SEX: 'M',
                  AGE: 35
                }
              },
              {
                formOid: 'VS',
                data: {
                  SYS: 120,
                  DIA: 80
                }
              }
            ]
          },
          {
            visitOid: 'VISIT-002',
            sequenceNumber: 2,
            availableDay: 1,
            forms: [
              {
                formOid: 'VS',
                data: {
                  SYS: 118,
                  DIA: 78
                }
              }
            ]
          }
        ]
      },
      {
        subjectKey: 100002,
        siteLocationOid: 'SITE-001',
        subjectStatus: 'Inactive',
        visits: [
          {
            visitOid: 'VISIT-001',
            sequenceNumber: 1,
            availableDay: 0,
            forms: [
              {
                formOid: 'DM',
                data: {
                  SEX: 'F'
                }
              }
            ]
          }
        ]
      }
    ]
  };

  it('includes only visits available for the current study day', () => {
    const subjects = buildClinicalViewSubjects(snapshot, { currentStudyDay: 0.4 });
    expect(subjects).toHaveLength(2);
    expect(subjects[0].visits).toHaveLength(1);
    expect(subjects[0].visits[0].visitOid).toBe('VISIT-001');
    expect(subjects[0].visits[0].forms).toHaveLength(2);
  });

  it('filters forms when formOid provided', () => {
    const subjects = buildClinicalViewSubjects(snapshot, { currentStudyDay: 2, formOid: 'VS' });
    expect(subjects).toHaveLength(1);
    expect(subjects[0].visits.length).toBe(2);
    expect(subjects[0].visits[0].forms).toHaveLength(1);
    expect(subjects[0].visits[0].forms[0].formOid).toBe('VS');
    expect(subjects[0].visits[1].forms[0].formOid).toBe('VS');
  });

  it('filters subjects when subjectKey provided', () => {
    const subjects = buildClinicalViewSubjects(snapshot, { currentStudyDay: 1, subjectKey: 100002 });
    expect(subjects).toHaveLength(1);
    expect(subjects[0].subjectKey).toBe('100002');
  });

  it('returns empty list when no data matches filters', () => {
    const subjects = buildClinicalViewSubjects(snapshot, { currentStudyDay: -1 });
    expect(subjects).toHaveLength(0);
  });
});
