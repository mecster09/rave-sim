import { FastifyRequest, FastifyReply } from 'fastify';
import { authenticateRequest } from '../utils/auth';
import { generateODMError } from '../utils/odm';

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const isAuthenticated = authenticateRequest(request);
  
  if (!isAuthenticated) {
    reply
      .code(401)
      .header('Content-Type', 'application/xml')
      .send(generateODMError('Authentication required. Provide Basic Auth or MAuth headers.'));
  }
}

