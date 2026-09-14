import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { tw } from '../../src/theme/tw';
import { Card, Badge, Button } from '../../src/components';

type PermStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable';

function toneFor(status: PermStatus): 'success' | 'danger' | 'warning' {
  if (status === 'granted') return 'success';
  if (status === 'denied') return 'danger';
  return 'warning';
}

export default function PermissionsScreen() {
  const [micStatus, setMicStatus] = useState<PermStatus>('undetermined');
  const [notifStatus, setNotifStatus] = useState<PermStatus>('undetermined');

  const refresh = useCallback(async () => {
    try {
      const mic = await ExpoSpeechRecognitionModule.getPermissionsAsync();
      setMicStatus(mic.granted ? 'granted' : mic.canAskAgain ? 'undetermined' : 'denied');
    } catch {
      setMicStatus('unavailable');
    }
    const notif = await Notifications.getPermissionsAsync();
    setNotifStatus(notif.granted ? 'granted' : notif.canAskAgain ? 'undetermined' : 'denied');
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const requestMic = async () => {
    try {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      setMicStatus(result.granted ? 'granted' : 'denied');
    } catch {
      setMicStatus('unavailable');
    }
  };

  const requestNotifications = async () => {
    const result = await Notifications.requestPermissionsAsync();
    setNotifStatus(result.granted ? 'granted' : 'denied');
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
        </Text>
        <Button
          label={notifStatus === 'denied' ? 'Open settings' : 'Request permission'}
          variant="secondary"
          onPress={notifStatus === 'denied' ? () => Linking.openSettings() : requestNotifications}
        />
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
