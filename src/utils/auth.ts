import { FastifyRequest } from 'fastify';

export interface AuthCredentials {
  username: string;
  password: string;
}

export function extractBasicAuth(authHeader: string): AuthCredentials | null {
  if (!authHeader.startsWith('Basic ')) {
    return null;
  }
  
  try {
    const base64Credentials = authHeader.substring(6);
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');
    
    if (!username || !password) {
      return null;
    }
    
    return { username, password };
  } catch (error) {
    return null;
  }
}

export function validateCredentials(credentials: AuthCredentials): boolean {
  // Mock validation - accept any non-empty credentials
  // In production, this would check against a database
  return credentials.username.length > 0 && credentials.password.length > 0;
}

export function checkMAuthHeader(request: FastifyRequest): boolean {
  // Stubbed MAuth verification
  const mAuthHeader = request.headers['x-mws-authentication'];
  
  // For mock, just check if header exists
  return !!mAuthHeader;
}

export function authenticateRequest(request: FastifyRequest): boolean {
  const authHeader = request.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Basic ')) {
    const credentials = extractBasicAuth(authHeader);
    if (credentials && validateCredentials(credentials)) {
      return true;
    }
  }
  
  // Try MAuth
  if (checkMAuthHeader(request)) {
    return true;
  }
  
  return false;
}

