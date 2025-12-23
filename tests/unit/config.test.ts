import { describe, expect, it } from 'vitest';
import { HarnessConfig, validateConfig } from '../../src/services/config';

const baseConfig: HarnessConfig = {
  studyName: 'study',
  siteCount: 2,
  subjectCount: 10,
  visitCountPerSubject: 3,
  formDataPointsPerVisit: 5,
  simSpeedMinutesPerDay: 60,
  resetOnStartup: false,
  truncateOdm: false
};

describe('validateConfig', () => {
  it('returns value when config is valid', () => {
    const result = validateConfig(baseConfig);

    expect(result).toEqual({ value: baseConfig });
  });

  it('applies defaults when optional flags omitted', () => {
    const { resetOnStartup, truncateOdm, ...rest } = baseConfig;
    const result = validateConfig(rest);

    expect(result).toEqual({ value: { ...rest, resetOnStartup: false, truncateOdm: false } });
  });

  it('returns error when input is not an object', () => {
    const result = validateConfig(null);

    expect(result).toEqual({ error: ['config must be an object'] });
  });

  it('returns error when studyName is empty', () => {
    const result = validateConfig({ ...baseConfig, studyName: '   ' });

    expect(result).toEqual({ error: ['studyName must be a non-empty string'] });
  });

  it('returns multiple errors when counts are invalid', () => {
    const result = validateConfig({
      ...baseConfig,
      siteCount: 0,
      subjectCount: 0,
      visitCountPerSubject: 0,
      formDataPointsPerVisit: 0
    });

    expect(result.error).toContain('siteCount must be an integer >= 1');
    expect(result.error).toContain('subjectCount must be an integer >= 1');
    expect(result.error).toContain('visitCountPerSubject must be an integer >= 1');
    expect(result.error).toContain('formDataPointsPerVisit must be an integer >= 1');
  });

  it('returns error when simSpeedMinutesPerDay is out of range', () => {
    const lowResult = validateConfig({ ...baseConfig, simSpeedMinutesPerDay: 0 });
    const highResult = validateConfig({ ...baseConfig, simSpeedMinutesPerDay: 1500 });

    expect(lowResult.error).toContain('simSpeedMinutesPerDay must be between 15 and 1440 in increments of 15');
    expect(highResult.error).toContain('simSpeedMinutesPerDay must be between 15 and 1440 in increments of 15');
  });

  it('returns error when simSpeedMinutesPerDay is not a multiple of 15', () => {
    const result = validateConfig({ ...baseConfig, simSpeedMinutesPerDay: 17 });

    expect(result.error).toContain('simSpeedMinutesPerDay must be between 15 and 1440 in increments of 15');
  });

  it('returns error when resetOnStartup is not boolean', () => {
    const result = validateConfig({ ...baseConfig, resetOnStartup: 'yes' as unknown as boolean });

    expect(result.error).toContain('resetOnStartup must be a boolean if provided');
  });

  it('returns error when truncateOdm is not boolean', () => {
    const result = validateConfig({ ...baseConfig, truncateOdm: 'true' as unknown as boolean });

    expect(result.error).toContain('truncateOdm must be a boolean if provided');
  });
});
