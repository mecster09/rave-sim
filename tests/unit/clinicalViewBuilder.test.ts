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
                  SEX: { valueRegular: 'M', valueRaw: 'M' },
                  BRTHDTC: { valueRegular: '1972-07-06', valueRaw: '06 JUL 1972' },
                  AGE: { valueRegular: 35, valueRaw: '35' }
                }
              },
              {
                formOid: 'VS',
                data: {
                  SYS: { valueRegular: 120, valueRaw: '120 mmHg', measurementUnitOid: 'MU.MMHG' },
                  DIA: { valueRegular: 80, valueRaw: '80 mmHg', measurementUnitOid: 'MU.MMHG' }
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
                  SYS: { valueRegular: 118, valueRaw: '118 mmHg', measurementUnitOid: 'MU.MMHG' },
                  DIA: { valueRegular: 78, valueRaw: '78 mmHg', measurementUnitOid: 'MU.MMHG' }
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
                  SEX: { valueRegular: 'F', valueRaw: 'F' }
                }
              }
            ]
          }
        ]
      }
    ]
  };

  it('includes only visits available for the current study day', () => {
    const subjects = buildClinicalViewSubjects(snapshot, { currentStudyDay: 0.4, mode: 'regular' });
    expect(subjects).toHaveLength(2);
    expect(subjects[0].visits).toHaveLength(1);
    expect(subjects[0].visits[0].visitOid).toBe('VISIT-001');
    expect(subjects[0].visits[0].forms).toHaveLength(2);
  });

  it('filters forms when formOid provided', () => {
    const subjects = buildClinicalViewSubjects(snapshot, { currentStudyDay: 2, formOid: 'VS', mode: 'regular' });
    expect(subjects).toHaveLength(1);
    expect(subjects[0].visits.length).toBe(2);
    expect(subjects[0].visits[0].forms).toHaveLength(1);
    expect(subjects[0].visits[0].forms[0].formOid).toBe('VS');
    expect(subjects[0].visits[1].forms[0].formOid).toBe('VS');
  });

  it('filters subjects when subjectKey provided', () => {
    const subjects = buildClinicalViewSubjects(snapshot, { currentStudyDay: 1, subjectKey: 100002, mode: 'regular' });
    expect(subjects).toHaveLength(1);
    expect(subjects[0].subjectKey).toBe('100002');
  });

  it('returns empty list when no data matches filters', () => {
    const subjects = buildClinicalViewSubjects(snapshot, { currentStudyDay: -1, mode: 'regular' });
    expect(subjects).toHaveLength(0);
  });

  it('applies startStudyDay filter to visits', () => {
    const subjects = buildClinicalViewSubjects(snapshot, {
      currentStudyDay: 5,
      startStudyDay: 1.1,
      mode: 'regular'
    });
    expect(subjects).toHaveLength(1);
    expect(subjects[0].visits).toHaveLength(1);
    expect(subjects[0].visits[0].visitOid).toBe('VISIT-002');
  });

  it('adds decoded, raw, and version items when requested', () => {
    const subjects = buildClinicalViewSubjects(snapshot, {
      currentStudyDay: 2,
      decodeSuffix: '_DEC',
      rawSuffix: '_RAW',
      versionItem: 'VERSION',
      mode: 'regular'
    });

    const firstFormItems = Object.fromEntries(
      subjects[0].visits[0].forms[0].items.map(item => [item.itemOid, item.value])
    );
    expect(firstFormItems).toHaveProperty('DM.VERSION');

    const dmForm = subjects[0].visits[0].forms.find(form => form.formOid === 'DM');
    expect(dmForm).toBeDefined();
    const dmValues = Object.fromEntries(dmForm!.items.map(item => [item.itemOid, item.value]));
    expect(dmValues['SEX_DEC']).toMatch(/DECODED-/);
    expect(dmValues['SEX_RAW']).toBe('M');
  });

  it('emits raw mode values with measurement units when available', () => {
    const subjects = buildClinicalViewSubjects(snapshot, { currentStudyDay: 2, mode: 'raw' });
    expect(subjects).toHaveLength(1);
    const dmForm = subjects[0].visits[0].forms.find(form => form.formOid === 'DM');
    const dmValues = Object.fromEntries(dmForm!.items.map(item => [item.itemOid, item.value]));
    expect(dmValues['BRTHDTC']).toBe('06 JUL 1972');
    const vsForm = subjects[0].visits[0].forms.find(form => form.formOid === 'VS');
    const systolic = vsForm!.items.find(item => item.itemOid === 'SYS');
    expect(systolic?.value).toBe('120 mmHg');
    expect(systolic?.measurementUnitOid).toBe('MU.MMHG');
  });
});
