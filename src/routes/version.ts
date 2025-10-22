import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth';

export default async function versionRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/RaveWebServices/version',
    { preHandler: authMiddleware },
    async (_request, reply) => {
      reply
        .code(200)
        .header('Content-Type', 'text/plain')
        .send('1.8.0');
    }
  );
}

