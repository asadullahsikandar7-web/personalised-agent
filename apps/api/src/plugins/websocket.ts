import fp from 'fastify-plugin';
import websocket from '@fastify/websocket';
import type { FastifyInstance } from 'fastify';

export default fp(async function websocketPlugin(app: FastifyInstance) {
  await app.register(websocket, {
    options: { maxPayload: 1_048_576 },
  });
});
