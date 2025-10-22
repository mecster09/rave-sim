import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth';

export default async function cacheRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/RaveWebServices/WebService.aspx',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const query = request.query as Record<string, string>;
      
      if ('CacheFlush' in query || query.CacheFlush === '') {
        reply
          .code(200)
          .header('Content-Type', 'application/json')
          .send({ status: 'cache flushed' });
      } else {
        reply
          .code(400)
          .send({ error: 'Unknown query parameter' });
      }
    }
  );
}

