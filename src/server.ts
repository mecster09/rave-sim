import Fastify from 'fastify';
import versionRoutes from './routes/version';
import cacheRoutes from './routes/cache';
import datasetRoutes from './routes/datasets';
import clinicalDataRoutes from './routes/clinical-data';

const fastify = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
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
fastify.register(versionRoutes);
fastify.register(cacheRoutes);
fastify.register(datasetRoutes);
fastify.register(clinicalDataRoutes);

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

// Error handler
fastify.setErrorHandler((error, _request, reply) => {
  fastify.log.error(error);
  
  const statusCode = error.statusCode || 500;
  
  reply.status(statusCode).send({
    error: error.name,
    message: error.message,
    statusCode,
  });
});

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000', 10);
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    
    fastify.log.info(`Server listening at http://${host}:${port}`);
    fastify.log.info('Rave Web Services Mock API is ready');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  fastify.log.info('SIGTERM received, closing server');
  await fastify.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  fastify.log.info('SIGINT received, closing server');
  await fastify.close();
  process.exit(0);
});

// Start the server if not in test mode
if (require.main === module) {
  start();
}

export default fastify;

