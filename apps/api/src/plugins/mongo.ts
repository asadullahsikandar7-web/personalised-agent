import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { connectMongo, disconnectMongo } from '../db/mongoose';

export default fp(async function mongoPlugin(app: FastifyInstance) {
  await connectMongo();
  app.addHook('onClose', async () => {
    await disconnectMongo();
  });
});
