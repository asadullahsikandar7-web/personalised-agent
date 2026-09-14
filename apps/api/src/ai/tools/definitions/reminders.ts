import { z } from 'zod';
import { defineTool } from '../types';
import * as reminderService from '../../../modules/schedules/service';
import { recurrenceRuleSchema } from '@personal-agent/shared';

export const createReminderTool = defineTool({
  name: 'create_reminder',
  description: 'Create a one-time or recurring reminder at a specific date/time. scheduledAt must be a full ISO 8601 datetime.',
  inputSchema: z.object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).optional(),
    scheduledAt: z.string().datetime(),
    timezone: z.string().optional(),
    recurrenceRule: recurrenceRuleSchema.optional(),
  }),
  permissionLevel: 'normal',
  async execute(input, context) {
    const reminder = await reminderService.createReminder(context.userId, {
      title: input.title,
      description: input.description,
      scheduledAt: input.scheduledAt,
      timezone: input.timezone || context.timezone || 'UTC',
      recurrenceRule: input.recurrenceRule,
      notificationChannel: 'local',
    });
    return { success: true, message: `Reminder "${reminder.title}" set for ${reminder.scheduledAt.toISOString()}.`, data: reminderService.toReminderDTO(reminder) };
  },
});

export const listRemindersTool = defineTool({
  name: 'list_reminders',
  description: 'List the user\'s upcoming or past reminders.',
  inputSchema: z.object({ status: z.string().optional() }),
  permissionLevel: 'safe',
  async execute(input, context) {
    const result = await reminderService.listReminders(context.userId, { status: input.status, page: 1, limit: 50 });
    return {
      success: true,
      message: result.items.length ? `You have ${result.items.length} reminder(s).` : 'No reminders found.',
      data: result.items,
    };
  },
});

export const updateReminderTool = defineTool({
  name: 'update_reminder',
  description: 'Update a reminder\'s title, time, or recurrence.',
  inputSchema: z.object({
    reminderId: z.string().min(1),
    title: z.string().trim().max(200).optional(),
    scheduledAt: z.string().datetime().optional(),
    timezone: z.string().optional(),
    recurrenceRule: recurrenceRuleSchema.optional(),
  }),
  permissionLevel: 'normal',
  async execute(input, context) {
    const { reminderId, ...rest } = input;
    const reminder = await reminderService.updateReminder(context.userId, reminderId, rest);
    return { success: true, message: `Reminder "${reminder.title}" updated.`, data: reminderService.toReminderDTO(reminder) };
  },
});

export const cancelReminderTool = defineTool({
  name: 'cancel_reminder',
  description: 'Cancel a scheduled reminder.',
  inputSchema: z.object({ reminderId: z.string().min(1) }),
  permissionLevel: 'normal',
  async execute(input, context) {
    const reminder = await reminderService.cancelReminder(context.userId, input.reminderId);
    return { success: true, message: `Reminder "${reminder.title}" cancelled.`, data: reminderService.toReminderDTO(reminder) };
  },
});

export const snoozeReminderTool = defineTool({
  name: 'snooze_reminder',
  description: 'Snooze a reminder by a number of minutes.',
  inputSchema: z.object({ reminderId: z.string().min(1), minutes: z.number().int().min(1).max(1440).default(10) }),
  permissionLevel: 'normal',
  async execute(input, context) {
    const reminder = await reminderService.snoozeReminder(context.userId, input.reminderId, input.minutes);
    return { success: true, message: `Reminder "${reminder.title}" snoozed for ${input.minutes} minutes.`, data: reminderService.toReminderDTO(reminder) };
  },
});

export const completeReminderTool = defineTool({
  name: 'complete_reminder',
  description: 'Mark a reminder as completed.',
  inputSchema: z.object({ reminderId: z.string().min(1) }),
  permissionLevel: 'normal',
  async execute(input, context) {
    const reminder = await reminderService.markReminderComplete(context.userId, input.reminderId);
    return { success: true, message: `Reminder "${reminder.title}" marked complete.`, data: reminderService.toReminderDTO(reminder) };
  },
});
