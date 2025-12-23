import { describe, expect, it } from 'vitest';
import { isAuthorized } from '../../src/plugins/basicAuth';

const USER = 'user';
const PASS = 'pass';

function createHeader(username: string, password: string) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

describe('isAuthorized', () => {
  it('returns false when credentials are not configured', () => {
    const header = createHeader(USER, PASS);
    expect(isAuthorized(header, undefined, undefined)).toBe(false);
  });

  it('returns false when authorization header is missing', () => {
    expect(isAuthorized(undefined, USER, PASS)).toBe(false);
  });

  it('returns false for mismatched credentials', () => {
    const header = createHeader(USER, 'wrong');
    expect(isAuthorized(header, USER, PASS)).toBe(false);
  });

  it('returns true for matching credentials', () => {
    const header = createHeader(USER, PASS);
    expect(isAuthorized(header, USER, PASS)).toBe(true);
  });
});
