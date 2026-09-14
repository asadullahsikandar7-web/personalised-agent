import { buildApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';

async function main() {
  const app = await buildApp();

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down server...');
    await app.close();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection');
  });

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  logger.info(`Personal Agent API listening on port ${env.PORT} (docs at /docs)`);
}

main().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
