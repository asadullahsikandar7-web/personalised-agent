import { Platform } from 'react-native';

// expo-notifications ships real native code and Android remote-notification support was removed
// from Expo Go as of SDK 53 - loading it lazily behind a try/catch keeps callers from crashing on
// import in Expo Go. See docs/known-platform-limitations.md.
let Notifications: typeof import('expo-notifications') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- must be lazy, see above
  Notifications = require('expo-notifications');
} catch {
  Notifications = null;
}

let Constants: typeof import('expo-constants').default | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- kept lazy alongside Notifications
  Constants = require('expo-constants').default;
} catch {
  Constants = null;
}

/**
 * Obtains a real Expo push token for this device, or null if that's not currently possible.
 * Requires: expo-notifications with remote-notification support (not Expo Go on Android since
 * SDK 53), a granted notification permission, and an EAS projectId configured in app.json
 * (`eas init` with an Expo account) - without a projectId, Expo cannot mint a push token.
 * Honestly returns null rather than faking one when any of these is missing.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Notifications) return null;

  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return null;

  const projectId = Constants?.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    console.warn(
      'Cannot register for push notifications: no EAS projectId configured (run `eas init`).',
    );
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch (err) {
    console.warn('Failed to obtain Expo push token', err);
    return null;
  }
}
