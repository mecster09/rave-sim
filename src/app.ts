import Fastify, { FastifyInstance } from 'fastify';
import versionRoutes from './routes/version';
import cacheRoutes from './routes/cache';
import datasetRoutes from './routes/datasets';
import clinicalDataRoutes from './routes/clinical-data';

export async function buildApp(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: false, // Disable for tests, enable in server.ts
    bodyLimit: 10485760, // 10MB for ODM XML uploads
  });

  // Register content type parsers
  fastify.addContentTypeParser('text/xml', { parseAs: 'string' }, (_req, body, done) => {
    done(null, body);
  });

  fastify.addContentTypeParser('application/xml', { parseAs: 'string' }, (_req, body, done) => {
    done(null, body);
  });

  // Register routes
  await fastify.register(versionRoutes);
  await fastify.register(cacheRoutes);
  await fastify.register(datasetRoutes);
  await fastify.register(clinicalDataRoutes);

  // Health check endpoint
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Root endpoint
  fastify.get('/', async () => {
    return {
      name: 'Rave Web Services Mock API',
      version: '1.8.0',
      endpoints: {
        version: 'GET /RaveWebServices/version',
        cacheFlush: 'GET /RaveWebServices/WebService.aspx?CacheFlush',
        datasets: 'GET /RaveWebServices/datasets/{dataset}.{format}',
        clinicalData: 'POST /RaveWebServices',
      },
    };
  });

  return fastify;
}

