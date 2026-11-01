# Scheduling System

## How a reminder becomes a notification

```
POST /api/reminders  or  create_reminder tool
  -> modules/schedules/service.ts: createReminder()
       - validates scheduledAt (ISO datetime)
       - stores the Reminder document (status: 'scheduled', nextTriggerAt = scheduledAt)
       - enqueues a BullMQ delayed job on the `reminders` queue, delayed until nextTriggerAt,
         with jobId = `<reminderId>-<nextTriggerAt-epoch-ms>` (the idempotency key)
...time passes...
BullMQ delivers the job to workers/reminder-worker.ts when it's due
  -> modules/schedules/service.ts: processReminderTrigger()
       - re-checks the reminder's current status (idempotent: a cancelled/completed reminder
         is a no-op even if a stale job somehow still fires)
       - records lastTriggeredAt
       - if it recurs, computes the next occurrence (modules/schedules/recurrence.ts) and
         enqueues the next job; otherwise marks it 'triggered'
  -> modules/notifications/service.ts: createNotification() (type: 'reminder')
  -> modules/activity/service.ts: logActivity()
```

## Recurrence

`recurrenceRule: { type, interval, daysOfWeek?, dayOfMonth?, cronExpression? }`:

- `none` - one-time (default when omitted)
- `daily` - every `interval` days
- `weekly` - on the given `daysOfWeek` (0=Sunday..6=Saturday; defaults to the original day), every
  `interval` weeks
- `monthly` - on `dayOfMonth` (defaults to the original day, clamped to the shorter month),
  every `interval` months
- `custom` - evaluates the supplied 5-field cron expression in the reminder's IANA timezone.
  Invalid expressions are treated as one-time reminders.

All recurrence math (`recurrence.ts`) is timezone-aware via `luxon`, computed in the reminder's
stored IANA `timezone`, not the server's local time or UTC.

## Idempotency & retry

- BullMQ's own `jobId` uniqueness prevents the same trigger from being double-enqueued.
- The worker re-validates the reminder's status before acting, so at-least-once delivery
  (BullMQ's guarantee) can't create a duplicate notification for an already-cancelled reminder.
- A failed job is retained (`removeOnFail: 100`, i.e. keeps the last 100) for inspection instead
  of silently vanishing; BullMQ's dashboard/CLI tooling can inspect the `reminders` queue in
  Redis directly if something needs debugging.
- Updating, snoozing, or cancelling a reminder always removes its currently-scheduled job first
  (`removeScheduledJob`) before scheduling a new one (or none, for cancel) - there is never more
  than one live job per reminder.

## Notification delivery today vs. the full picture

- **In-app notifications** (the `Notification` model, surfaced on the mobile Notifications
  screen) are created for every triggered reminder today, unconditionally - this channel always
  works, with no device configuration required.
- **Local device notifications** (Expo Notifications scheduling a native OS notification while
  the app is installed) are a mobile-side concern, not orchestrated by the backend today - the
  `notificationChannel` field on a reminder is stored and returned to the client, but the backend
  does not yet push through Expo's push service. See `docs/known-platform-limitations.md` for
  exactly what's implemented versus foundation-only, and what wiring up real push delivery would
  require (device push tokens, `expo-notifications`' push API, and either polling or a
  server-to-Expo push call from the worker when a reminder triggers).

## Testing

`tests/integration/reminders.test.ts` creates a reminder against a real BullMQ queue (backed by
the same Redis you'd run locally) and asserts the job actually exists, that snoozing moves
`nextTriggerAt` into the future, and that cancelling removes it. `tests/unit/recurrence.test.ts`
covers the daily/weekly/monthly/custom math directly.
