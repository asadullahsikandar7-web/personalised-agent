import { logger } from '../../utils/logger';

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

interface ExpoPushTicket {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
}

/**
 * Sends a push notification through Expo's push service. Expo tokens (ExponentPushToken[...])
 * are the only kind this project issues - see docs/known-platform-limitations.md for what it
 * takes for the mobile app to actually obtain one. A failed send is logged and swallowed: a push
 * delivery failure must never fail the reminder trigger that queued it.
 */
export async function sendExpoPush(
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<boolean> {
  if (!pushToken.startsWith('ExponentPushToken')) {
    logger.warn({ pushToken }, 'Skipping push send: not a well-formed Expo push token');
    return false;
  }

  try {
    const res = await fetch(EXPO_PUSH_ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to: pushToken, title, body, data, priority: 'high' }),
    });

    const json = (await res.json()) as { data?: ExpoPushTicket };
    const ticket = json.data;
    if (!res.ok || ticket?.status === 'error') {
      logger.error({ status: res.status, ticket }, 'Expo push send failed');
      return false;
    }
    return true;
  } catch (err) {
    logger.error({ err }, 'Expo push send threw');
    return false;
  }
}
