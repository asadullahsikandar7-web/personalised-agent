import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Linking, Platform } from 'react-native';
import { tw } from '../../src/theme/tw';
import { Card, Badge, Button } from '../../src/components';
import { registerForPushNotificationsAsync } from '../../src/services/push-notifications';
import { useUpdateUserPreferences } from '../../src/hooks/useUserPreferences';

// Both of these ship real native code and can throw merely by being imported when unavailable
// (expo-speech-recognition: no third-party native modules in Expo Go; expo-notifications:
// Android remote-notification support was removed from Expo Go as of SDK 53). Loading them
// lazily behind a try/catch keeps this whole screen from crashing on import - see
// docs/known-platform-limitations.md.
let ExpoSpeechRecognitionModule: typeof import('expo-speech-recognition').ExpoSpeechRecognitionModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- must be lazy, see above
  ExpoSpeechRecognitionModule = require('expo-speech-recognition').ExpoSpeechRecognitionModule;
} catch {
  ExpoSpeechRecognitionModule = null;
}

let Notifications: typeof import('expo-notifications') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- must be lazy, see above
  Notifications = require('expo-notifications');
} catch {
  Notifications = null;
}

type PermStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable';

function toneFor(status: PermStatus): 'success' | 'danger' | 'warning' {
  if (status === 'granted') return 'success';
  if (status === 'denied') return 'danger';
  return 'warning';
}

export default function PermissionsScreen() {
  const [micStatus, setMicStatus] = useState<PermStatus>('undetermined');
  const [notifStatus, setNotifStatus] = useState<PermStatus>('undetermined');
  const updatePreferences = useUpdateUserPreferences();

  const refresh = useCallback(async () => {
    if (!ExpoSpeechRecognitionModule) {
      setMicStatus('unavailable');
    } else {
      try {
        const mic = await ExpoSpeechRecognitionModule.getPermissionsAsync();
        setMicStatus(mic.granted ? 'granted' : mic.canAskAgain ? 'undetermined' : 'denied');
      } catch {
        setMicStatus('unavailable');
      }
    }

    if (!Notifications) {
      setNotifStatus('unavailable');
    } else {
      try {
        const notif = await Notifications.getPermissionsAsync();
        setNotifStatus(notif.granted ? 'granted' : notif.canAskAgain ? 'undetermined' : 'denied');
      } catch {
        setNotifStatus('unavailable');
      }
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const requestMic = async () => {
    if (!ExpoSpeechRecognitionModule) return;
    try {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      setMicStatus(result.granted ? 'granted' : 'denied');
    } catch {
      setMicStatus('unavailable');
    }
  };

  const requestNotifications = async () => {
    if (!Notifications) return;
    try {
      const result = await Notifications.requestPermissionsAsync();
      setNotifStatus(result.granted ? 'granted' : 'denied');
      if (result.granted) {
        const pushToken = await registerForPushNotificationsAsync();
        if (pushToken) {
          updatePreferences.mutate({ pushToken, defaultReminderChannel: 'push' });
        }
      }
    } catch {
      setNotifStatus('unavailable');
    }
  };

  return (
    <ScrollView className={tw.screen} contentContainerClassName="px-5 pt-4 pb-10">
      <Text className={`${tw.textSecondary} mb-5`}>
        Personal Agent only requests the device permissions it actually needs, and only when a
        feature that needs them is used.
      </Text>

      <Card className="mb-4">
        <View className="flex-row items-center justify-between mb-2">
          <Text className={`${tw.textPrimary} font-medium`}>Microphone & speech recognition</Text>
          <Badge label={micStatus} tone={toneFor(micStatus)} />
        </View>
        <Text className={`${tw.textSecondary} text-sm mb-3`}>
          Used only when you tap the microphone button to talk to the assistant.
          {micStatus === 'unavailable'
            ? ' On-device speech recognition is unavailable in this build (normal for Expo Go - requires a development build).'
            : ''}
        </Text>
        {micStatus !== 'unavailable' && (
          <Button
            label={micStatus === 'denied' ? 'Open settings' : 'Request permission'}
            variant="secondary"
            onPress={micStatus === 'denied' ? () => Linking.openSettings() : requestMic}
          />
        )}
      </Card>

      <Card className="mb-4">
        <View className="flex-row items-center justify-between mb-2">
          <Text className={`${tw.textPrimary} font-medium`}>Notifications</Text>
          <Badge label={notifStatus} tone={toneFor(notifStatus)} />
        </View>
        <Text className={`${tw.textSecondary} text-sm mb-3`}>
          Used to alert you about reminders, approval requests, and tool failures.
          {notifStatus === 'unavailable'
            ? ' Remote push notifications are unavailable in Expo Go as of SDK 53 - local, in-app notifications still work in a development build.'
            : ''}
        </Text>
        {notifStatus !== 'unavailable' && (
          <Button
            label={notifStatus === 'denied' ? 'Open settings' : 'Request permission'}
            variant="secondary"
            onPress={notifStatus === 'denied' ? () => Linking.openSettings() : requestNotifications}
          />
        )}
      </Card>

      <Card>
        <Text className={`${tw.textPrimary} font-medium mb-2`}>What this app never does</Text>
        <Text className={`${tw.textSecondary} text-sm`}>
          Personal Agent never bypasses your device lock screen, other apps&apos; permissions, or
          operating system restrictions. {Platform.OS === 'android' ? 'Android' : 'iOS'} always
          shows the native permission dialog - we cannot skip it.
        </Text>
      </Card>
    </ScrollView>
  );
}
