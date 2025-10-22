import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth';
import { loadConfig } from '../config';

export default async function versionRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/RaveWebServices/version',
    { preHandler: authMiddleware },
    async (_request, reply) => {
      const config = loadConfig(process.env.NODE_ENV === 'test' ? 'test' : 'production');
      reply
        .code(200)
        .header('Content-Type', 'text/plain')
        .send(config.rws.version);
    }
  );
}

