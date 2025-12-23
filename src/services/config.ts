export interface HarnessConfig {
  studyName: string;
  siteCount: number;
  subjectCount: number;
  visitCountPerSubject: number;
  formDataPointsPerVisit: number;
  simSpeedMinutesPerDay: number;
  resetOnStartup: boolean;
  truncateOdm: boolean;
}

interface SuccessResult {
  value: HarnessConfig;
  error?: undefined;
}

interface ErrorResult {
  error: string[];
  value?: undefined;
}

export type ValidateConfigResult = SuccessResult | ErrorResult;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateConfig(input: unknown): ValidateConfigResult {
  if (!isPlainObject(input)) {
    return { error: ['config must be an object'] };
  }

  const errors: string[] = [];

  const {
    studyName,
    siteCount,
    subjectCount,
    visitCountPerSubject,
    formDataPointsPerVisit,
    simSpeedMinutesPerDay,
    resetOnStartup,
    truncateOdm
  } = input as Partial<HarnessConfig> & Record<string, unknown>;

  let normalizedStudyName: string | undefined;

  if (typeof studyName !== 'string' || studyName.trim().length === 0) {
    errors.push('studyName must be a non-empty string');
  } else {
    normalizedStudyName = studyName.trim();
  }

  if (!isValidPositiveInteger(siteCount)) {
    errors.push('siteCount must be an integer >= 1');
  }

  if (!isValidPositiveInteger(subjectCount)) {
    errors.push('subjectCount must be an integer >= 1');
  }

  if (!isValidPositiveInteger(visitCountPerSubject)) {
    errors.push('visitCountPerSubject must be an integer >= 1');
  }

  if (!isValidPositiveInteger(formDataPointsPerVisit)) {
    errors.push('formDataPointsPerVisit must be an integer >= 1');
  }

  if (!isValidSimSpeed(simSpeedMinutesPerDay)) {
    errors.push('simSpeedMinutesPerDay must be between 15 and 1440 in increments of 15');
  }

  if (typeof resetOnStartup !== 'boolean' && typeof resetOnStartup !== 'undefined') {
    errors.push('resetOnStartup must be a boolean if provided');
  }

  if (typeof truncateOdm !== 'boolean' && typeof truncateOdm !== 'undefined') {
    errors.push('truncateOdm must be a boolean if provided');
  }

  if (errors.length > 0) {
    return { error: errors };
  }

  return {
    value: {
      studyName: normalizedStudyName!,
      siteCount: siteCount as number,
      subjectCount: subjectCount as number,
      visitCountPerSubject: visitCountPerSubject as number,
      formDataPointsPerVisit: formDataPointsPerVisit as number,
      simSpeedMinutesPerDay: simSpeedMinutesPerDay as number,
      resetOnStartup: typeof resetOnStartup === 'boolean' ? resetOnStartup : false,
      truncateOdm: typeof truncateOdm === 'boolean' ? truncateOdm : false
    }
  };
}

function isValidPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && typeof value === 'number' && value >= 1;
}

function isValidSimSpeed(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 15 &&
    value <= 1440 &&
    value % 15 === 0
  );
}
