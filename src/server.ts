import Fastify from 'fastify';
import basicAuthPlugin from './plugins/basicAuth';

export function buildServer() {
  const app = Fastify({ logger: true });

  app.register(basicAuthPlugin);

  app.get('/health', async () => {
    return { status: 'ok' };
  });

  app.get('/protected-ping', async () => {
    return { ok: true };
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
