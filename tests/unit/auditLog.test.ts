import { describe, expect, it } from 'vitest';
import { buildAuditPage } from '../../src/services/auditLog';
import { SimulatorState } from '../../src/services/simulatorState';
import { HarnessConfig } from '../../src/services/config';

const baseConfig: HarnessConfig = {
  studyName: 'Audit Study',
  siteCount: 1,
  subjectCount: 2,
  visitCountPerSubject: 2,
  formDataPointsPerVisit: 2,
  simSpeedMinutesPerDay: 60,
  resetOnStartup: false,
  randomSeed: 222222,
  truncateOdm: false
};

describe('auditLog', () => {
  it('paginates audit records deterministically', () => {
    const state = new SimulatorState(baseConfig, 12345);
    const { auditRecords, nextId, totalRecords } = buildAuditPage(state, {
      studyOid: 'STUDY',
      metadataVersionOid: 'MDV',
      unicode: false,
      mode: 'default',
      startId: '',
      pageSize: 5,
      backfillComplete: true
    });

    expect(auditRecords.length).toBe(5);
    expect(typeof nextId === 'string' || nextId === null).toBe(true);
    expect(totalRecords).toBeGreaterThan(5);
  });

  it('applies startId offset', () => {
    const state = new SimulatorState(baseConfig, 12345);
    const firstPage = buildAuditPage(state, {
      studyOid: 'STUDY',
      metadataVersionOid: 'MDV',
      unicode: false,
      mode: 'default',
      startId: '',
      pageSize: 3,
      backfillComplete: true
    });

    const secondPage = buildAuditPage(state, {
      studyOid: 'STUDY',
      metadataVersionOid: 'MDV',
      unicode: false,
      mode: 'default',
      startId: firstPage.auditRecords[2].id,
      pageSize: 3,
      backfillComplete: true
    });

    expect(secondPage.auditRecords[0].id).not.toBe(firstPage.auditRecords[0].id);
    expect(secondPage.totalRecords).toBeLessThan(firstPage.totalRecords);
  });

  it('applies unicode suffix when enabled', () => {
    const state = new SimulatorState(baseConfig, 54321);
    const page = buildAuditPage(state, {
      studyOid: 'STUDY',
      metadataVersionOid: 'MDV',
      unicode: true,
      mode: 'default',
      startId: '',
      pageSize: 1,
      backfillComplete: true
    });

    expect(page.auditRecords[0].userOid).toContain('ユニコード');
  });

  it('gates enhanced mode when backfill incomplete', () => {
    const state = new SimulatorState(baseConfig, 9876);
    const page = buildAuditPage(state, {
      studyOid: 'STUDY',
      metadataVersionOid: 'MDV',
      unicode: false,
      mode: 'enhanced',
      startId: '',
      pageSize: 10,
      backfillComplete: false
    });

    const fullPage = buildAuditPage(state, {
      studyOid: 'STUDY',
      metadataVersionOid: 'MDV',
      unicode: false,
      mode: 'all',
      startId: '',
      pageSize: 10,
      backfillComplete: true
    });

    expect(page.totalRecords).toBeLessThan(fullPage.totalRecords);
  });
});
