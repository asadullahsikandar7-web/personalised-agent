import { UserModel, UserPreferenceModel, type UserDoc } from '../../db/models';
import { AppError } from '../../utils/errors';

export async function getUserOrThrow(userId: string): Promise<UserDoc> {
  const user = await UserModel.findById(userId);
  if (!user) throw AppError.notFound('User not found');
  return user;
}

export async function updateProfile(userId: string, input: { name?: string; timezone?: string }): Promise<UserDoc> {
  const user = await getUserOrThrow(userId);
  if (input.name) user.name = input.name;
  if (input.timezone) user.timezone = input.timezone;
  await user.save();
  return user;
}

export async function getOrCreatePreferences(userId: string) {
  let prefs = await UserPreferenceModel.findOne({ userId });
  if (!prefs) prefs = await UserPreferenceModel.create({ userId });
  return prefs;
}

export async function updatePreferences(
  userId: string,
  input: Partial<{
    theme: 'system' | 'light' | 'dark';
    voiceEnabled: boolean;
    ttsEnabled: boolean;
    notificationsEnabled: boolean;
    pushToken: string | null;
    defaultReminderChannel: 'push' | 'local' | 'in_app';
  }>,
) {
  const prefs = await getOrCreatePreferences(userId);
  Object.assign(prefs, input);
  await prefs.save();
  return prefs;
}
