import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

export default function AppLayout() {
  const colorScheme = useColorScheme();
  const headerBg = colorScheme === 'dark' ? '#17181D' : '#FFFFFF';
  const headerText = colorScheme === 'dark' ? '#F5F5F7' : '#15161A';

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: headerBg },
        headerTintColor: headerText,
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: colorScheme === 'dark' ? '#0E0F13' : '#FAFAFA' },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="reminders" options={{ title: 'Reminders' }} />
      <Stack.Screen name="memories" options={{ title: 'Memories' }} />
      <Stack.Screen name="music" options={{ title: 'Music' }} />
      <Stack.Screen name="activity" options={{ title: 'Activity' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Stack.Screen name="profile" options={{ title: 'Profile' }} />
      <Stack.Screen name="permissions" options={{ title: 'Permissions' }} />
      <Stack.Screen name="about" options={{ title: 'About & Help' }} />
      <Stack.Screen name="tools" options={{ title: 'Tools' }} />
      <Stack.Screen name="conversations/[id]" options={{ title: 'Conversation' }} />
    </Stack>
  );
}
