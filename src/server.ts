import Fastify from 'fastify';

export function buildServer() {
  const app = Fastify({ logger: true });

  app.get('/health', async () => {
    return { status: 'ok' };
  });

  return app;
}

/* c8 ignore start - runtime bootstrap */
if (require.main === module) {
  const app = buildServer();
  const port = Number(process.env.PORT) || 3000;
  app.listen({ port }, err => {
    if (err) {
      app.log.error(err);
      process.exit(1);
    }
  });
}
/* c8 ignore stop */
