import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { REQUEST_ID_HEADER } from '../config/constants';

/** Ensures every request/response pair carries a stable request id for tracing and API envelopes. */
export default fp(async function requestContextPlugin(app: FastifyInstance) {
  app.addHook('onRequest', async (request, reply) => {
    const incoming = request.headers[REQUEST_ID_HEADER];
    const id = (Array.isArray(incoming) ? incoming[0] : incoming) ?? randomUUID();
    request.id = id;
    reply.header(REQUEST_ID_HEADER, id);
  });
});
