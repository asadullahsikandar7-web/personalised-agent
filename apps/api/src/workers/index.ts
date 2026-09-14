import { connectMongo } from '../db/mongoose';
import { startReminderWorker } from './reminder-worker';
import { logger } from '../utils/logger';

async function main() {
  await connectMongo();
  const worker = startReminderWorker();
  logger.info('Reminder worker started');

  const shutdown = async () => {
    logger.info('Shutting down worker...');
    await worker.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  logger.error({ err }, 'Worker failed to start');
  process.exit(1);
});
