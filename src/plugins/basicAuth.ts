import { Buffer } from 'node:buffer';
import { FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

export function isAuthorized(
  authorizationHeader: string | undefined,
  expectedUser: string | undefined,
  expectedPass: string | undefined
): boolean {
  if (!expectedUser || !expectedPass) {
    return false;
  }

  if (!authorizationHeader || !authorizationHeader.startsWith('Basic ')) {
    return false;
  }

  const encodedCredentials = authorizationHeader.slice('Basic '.length).trim();
  let decoded: string;

  try {
    decoded = Buffer.from(encodedCredentials, 'base64').toString('utf8');
  } catch {
    return false;
  }

  const separatorIndex = decoded.indexOf(':');
  if (separatorIndex === -1) {
    return false;
  }

  const username = decoded.slice(0, separatorIndex);
  const password = decoded.slice(separatorIndex + 1);

  return username === expectedUser && password === expectedPass;
}

function needsAuth(request: FastifyRequest): boolean {
  const path = request.raw.url?.split('?')[0] ?? '';
  const publicPaths = new Set(['/health', '/harness/status', '/harness/time']);
  return !publicPaths.has(path);
}

async function handleUnauthorized(reply: FastifyReply) {
  reply.code(401).header('www-authenticate', 'Basic realm="Restricted"');
  await reply.send({ error: 'Unauthorized' });
}

const basicAuthPlugin = fp(async fastify => {
  const expectedUser = process.env.BASIC_AUTH_USER;
  const expectedPass = process.env.BASIC_AUTH_PASS;

  fastify.addHook('onRequest', async (request, reply) => {
    if (!needsAuth(request)) {
      return;
    }

    if (isAuthorized(request.headers.authorization, expectedUser, expectedPass)) {
      return;
    }

    return handleUnauthorized(reply);
  });
});

export default basicAuthPlugin;
