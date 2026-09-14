import { View, Text, Pressable, ScrollView, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { tw } from '../../../src/theme/tw';
import { Card } from '../../../src/components';
import { useAuthStore } from '../../../src/stores/auth-store';
import { useUIStore, type ThemePreference } from '../../../src/stores/ui-store';
import { useUserPreferences, useUpdateUserPreferences } from '../../../src/hooks/useUserPreferences';
import { useCurrentUser } from '../../../src/hooks/useCurrentUser';

const THEME_OPTIONS: { label: string; value: ThemePreference }[] = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

function Row({ label, right, onPress }: { label: string; right?: React.ReactNode; onPress?: () => void }) {
  const content = (
    <View className="flex-row items-center justify-between py-3.5">
      <Text className={tw.textPrimary}>{label}</Text>
      {right}
    </View>
  );
  if (!onPress) return content;
  return <Pressable onPress={onPress}>{content}</Pressable>;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const logout = useAuthStore((s) => s.logout);
  const themePreference = useUIStore((s) => s.themePreference);
  const setThemePreference = useUIStore((s) => s.setThemePreference);
  const preferences = useUserPreferences();
  const updatePreferences = useUpdateUserPreferences();

  const confirmLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <SafeAreaView className={tw.screen} edges={['top']}>
      <ScrollView contentContainerClassName="px-5 pb-10">
        <Text className={`${tw.heading} mt-3 mb-1`}>Settings</Text>
        <Text className={`${tw.textSecondary} mb-6`}>{user?.email}</Text>

        <Text className={`${tw.label} mb-2`}>Account</Text>
        <Card className="mb-5">
          <Row label="Profile" onPress={() => router.push('/(app)/profile')} right={<Text className={tw.textMuted}>›</Text>} />
          <View className={tw.divider} />
          <Row label="Permissions" onPress={() => router.push('/(app)/permissions')} right={<Text className={tw.textMuted}>›</Text>} />
          <View className={tw.divider} />
          <Row label="Notifications" onPress={() => router.push('/(app)/notifications')} right={<Text className={tw.textMuted}>›</Text>} />
        </Card>

        <Text className={`${tw.label} mb-2`}>Appearance</Text>
        <Card className="mb-5">
          <View className="flex-row gap-2 py-1">
            {THEME_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setThemePreference(opt.value)}
                className={`flex-1 rounded-xl py-2.5 items-center ${
                  themePreference === opt.value ? 'bg-light-primary dark:bg-dark-primary' : 'bg-light-surfaceAlt dark:bg-dark-surfaceAlt'
                }`}
              >
                <Text className={themePreference === opt.value ? 'text-white font-semibold' : tw.textSecondary}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>

        <Text className={`${tw.label} mb-2`}>Assistant</Text>
        <Card className="mb-5">
          <Row
            label="Voice input"
            right={
              <Switch
                value={preferences.data?.voiceEnabled ?? true}
                onValueChange={(value) => updatePreferences.mutate({ voiceEnabled: value })}
              />
            }
          />
          <View className={tw.divider} />
          <Row
            label="Speak replies aloud"
            right={
              <Switch
                value={preferences.data?.ttsEnabled ?? true}
                onValueChange={(value) => updatePreferences.mutate({ ttsEnabled: value })}
              />
            }
          />
          <View className={tw.divider} />
          <Row
            label="Notifications enabled"
            right={
              <Switch
                value={preferences.data?.notificationsEnabled ?? true}
                onValueChange={(value) => updatePreferences.mutate({ notificationsEnabled: value })}
              />
            }
          />
        </Card>

        <Text className={`${tw.label} mb-2`}>More</Text>
        <Card className="mb-5">
          <Row label="Manage tools" onPress={() => router.push('/(app)/tools')} right={<Text className={tw.textMuted}>›</Text>} />
          <View className={tw.divider} />
          <Row label="Activity history" onPress={() => router.push('/(app)/activity')} right={<Text className={tw.textMuted}>›</Text>} />
          <View className={tw.divider} />
          <Row label="About & Help" onPress={() => router.push('/(app)/about')} right={<Text className={tw.textMuted}>›</Text>} />
        </Card>

        <Pressable onPress={confirmLogout} className="items-center py-3.5">
          <Text className={`${tw.badgeDangerText} font-semibold text-base`}>Log out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
