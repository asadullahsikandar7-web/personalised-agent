/**
 * Development seed script. Creates one demo user with sample conversations, memories, tasks,
 * reminders, activity logs, and music history so the mobile app has realistic data to render
 * against immediately after `pnpm db:seed`. Never run against a production database.
 *
 * Demo credentials (local development only - not a real account):
 *   email:    demo@personalagent.local
 *   password: DemoPass123!
 */
import 'dotenv/config';
import { connectMongo, disconnectMongo } from '../src/db/mongoose';
import {
  UserModel,
  UserPreferenceModel,
  ConversationModel,
  MessageModel,
  MemoryModel,
  TaskModel,
  ReminderModel,
  ActivityLogModel,
  MusicPlaybackModel,
} from '../src/db/models';
import { hashPassword } from '../src/utils/password';
import { logger } from '../src/utils/logger';

const DEMO_EMAIL = 'demo@personalagent.local';
const DEMO_PASSWORD = 'DemoPass123!';

async function seed() {
  await connectMongo();

  const existing = await UserModel.findOne({ email: DEMO_EMAIL });
  if (existing) {
    logger.info('Demo user already exists, wiping their data before reseeding...');
    const userId = existing._id;
    await Promise.all([
      ConversationModel.deleteMany({ userId }),
      MessageModel.deleteMany({ userId }),
      MemoryModel.deleteMany({ userId }),
      TaskModel.deleteMany({ userId }),
      ReminderModel.deleteMany({ userId }),
      ActivityLogModel.deleteMany({ userId }),
      MusicPlaybackModel.deleteMany({ userId }),
    ]);
    await existing.deleteOne();
  }

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const user = await UserModel.create({
    email: DEMO_EMAIL,
    passwordHash,
    name: 'Demo User',
    timezone: 'America/New_York',
  });
  await UserPreferenceModel.create({ userId: user._id });

  const conversation = await ConversationModel.create({
    userId: user._id,
    title: 'Planning my week',
    lastMessagePreview: "Sure, I've added that reminder for you.",
    messageCount: 2,
  });
  await MessageModel.create([
    {
      conversationId: conversation._id,
      userId: user._id,
      role: 'user',
      content: 'Remind me to study Data Structures at 7 PM.',
    },
    {
      conversationId: conversation._id,
      userId: user._id,
      role: 'assistant',
      content: "Sure, I've added that reminder for you.",
      toolCalls: [
        {
          toolName: 'create_reminder',
          input: { title: 'Study Data Structures', scheduledAtText: '7 PM' },
          status: 'succeeded',
        },
      ],
    },
  ]);

  await MemoryModel.create([
    { userId: user._id, category: 'preference', key: 'Preferred language', value: 'TypeScript', source: 'user', isPinned: true },
    { userId: user._id, category: 'project', key: 'Current project', value: 'Building Acadexa', source: 'user', isPinned: false },
    { userId: user._id, category: 'routine', key: 'Study time', value: 'Studies Data Structures most evenings around 7 PM', source: 'agent', isPinned: false },
  ]);

  await TaskModel.create([
    { userId: user._id, title: 'Finish Acadexa dashboard', priority: 'high', status: 'in_progress', tags: ['acadexa', 'frontend'] },
    { userId: user._id, title: 'Review AI QA Agent PR', priority: 'medium', status: 'pending', tags: ['ai-qa-agent'] },
    { userId: user._id, title: 'Write unit tests for scheduler', priority: 'medium', status: 'completed', completedAt: new Date(), tags: ['backend'] },
  ]);

  const tomorrow9am = new Date();
  tomorrow9am.setDate(tomorrow9am.getDate() + 1);
  tomorrow9am.setHours(9, 0, 0, 0);

  await ReminderModel.create([
    {
      userId: user._id,
      title: 'Study Data Structures',
      scheduledAt: new Date(new Date().setHours(19, 0, 0, 0)),
      timezone: user.timezone,
      status: 'scheduled',
      nextTriggerAt: new Date(new Date().setHours(19, 0, 0, 0)),
      notificationChannel: 'local',
    },
    {
      userId: user._id,
      title: 'Morning planning session',
      scheduledAt: tomorrow9am,
      timezone: user.timezone,
      recurrenceRule: { type: 'daily', interval: 1 },
      status: 'scheduled',
      nextTriggerAt: tomorrow9am,
      notificationChannel: 'local',
    },
  ]);

  await ActivityLogModel.create([
    { userId: user._id, action: 'auth.register', category: 'auth', description: 'Account created' },
    { userId: user._id, action: 'task.created', category: 'tool', description: 'Task created: Finish Acadexa dashboard' },
    { userId: user._id, action: 'reminder.created', category: 'tool', description: 'Reminder set: Study Data Structures' },
    { userId: user._id, action: 'agent.message_processed', category: 'agent', description: 'Processed text message in conversation' },
  ]);

  await MusicPlaybackModel.create({
    userId: user._id,
    provider: 'mock',
    state: 'paused',
    currentTrack: { id: 't1', title: 'Deep Focus', artist: 'Study Beats', album: 'Focus Vol. 1', durationSeconds: 245 },
    positionSeconds: 42,
    history: [
      { id: 't1', title: 'Deep Focus', artist: 'Study Beats', album: 'Focus Vol. 1', durationSeconds: 245 },
      { id: 't2', title: 'Late Night Coding', artist: 'Lo-Fi Collective', album: 'Sessions', durationSeconds: 198 },
    ],
  });

  logger.info({ email: DEMO_EMAIL, password: DEMO_PASSWORD }, 'Seed complete - demo credentials (local dev only)');
  await disconnectMongo();
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error({ err }, 'Seed failed');
    process.exit(1);
  });
