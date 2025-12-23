export function parseTruncateFlag(raw: unknown) {
  if (typeof raw === 'undefined') {
    return { valid: true, requested: false } as const;
  }

  if (typeof raw !== 'string') {
    return { valid: false, requested: false } as const;
  }

  const value = raw.trim().toLowerCase();

  if (value === 'true' || value === '1') {
    return { valid: true, requested: true } as const;
  }

  if (value === 'false' || value === '0') {
    return { valid: true, requested: false } as const;
  }

  return { valid: false, requested: false } as const;
}
