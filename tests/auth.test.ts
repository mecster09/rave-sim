import { extractBasicAuth, validateCredentials, checkMAuthHeader } from '../src/utils/auth';
import { FastifyRequest } from 'fastify';

describe('Authentication Utils', () => {
  describe('extractBasicAuth', () => {
    it('should extract credentials from valid Basic Auth header', () => {
      const base64Creds = Buffer.from('testuser:testpass').toString('base64');
      const authHeader = `Basic ${base64Creds}`;
      
      const result = extractBasicAuth(authHeader);
      
      expect(result).toEqual({
        username: 'testuser',
        password: 'testpass',
      });
    });

    it('should return null for invalid header format', () => {
      const result = extractBasicAuth('Bearer token123');
      expect(result).toBeNull();
    });

    it('should return null for malformed credentials', () => {
      const result = extractBasicAuth('Basic invalid');
      expect(result).toBeNull();
    });
  });

  describe('validateCredentials', () => {
    it('should accept valid credentials', () => {
      const result = validateCredentials({
        username: 'user',
        password: 'pass',
      });
      expect(result).toBe(true);
    });

    it('should reject empty username', () => {
      const result = validateCredentials({
        username: '',
        password: 'pass',
      });
      expect(result).toBe(false);
    });

    it('should reject empty password', () => {
      const result = validateCredentials({
        username: 'user',
        password: '',
      });
      expect(result).toBe(false);
    });
  });

  describe('checkMAuthHeader', () => {
    it('should accept request with MAuth header', () => {
      const request = {
        headers: {
          'x-mws-authentication': 'mock-signature',
        },
      } as unknown as FastifyRequest;
      
      const result = checkMAuthHeader(request);
      expect(result).toBe(true);
    });

    it('should reject request without MAuth header', () => {
      const request = {
        headers: {},
      } as unknown as FastifyRequest;
      
      const result = checkMAuthHeader(request);
      expect(result).toBe(false);
    });
  });
});

