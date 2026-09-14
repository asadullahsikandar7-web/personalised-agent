import mongoose from 'mongoose';
import { env } from '../config/env';
import { logger } from '../utils/logger';

let connected = false;

export async function connectMongo(): Promise<typeof mongoose> {
  if (connected) return mongoose;
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGODB_URI);
  connected = true;
  logger.info({ uri: env.MONGODB_URI.replace(/\/\/.*@/, '//***@') }, 'Connected to MongoDB');
  return mongoose;
}

export async function disconnectMongo(): Promise<void> {
  if (!connected) return;
  await mongoose.disconnect();
  connected = false;
}

export function isMongoConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
