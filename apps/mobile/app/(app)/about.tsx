import { View, Text, ScrollView, Linking, Pressable } from 'react-native';
import Constants from 'expo-constants';
import { tw } from '../../src/theme/tw';
import { Card } from '../../src/components';

const FAQ = [
  {
    q: 'Does the agent listen all the time?',
    a: 'No. Voice capture only happens in the foreground while you are actively using the Assistant screen and have tapped the microphone button. Always-on or lock-screen listening is not supported.',
  },
  {
    q: 'Can it control any music app?',
    a: 'Not yet automatically. Today it controls a built-in mock/demo catalog. Controlling third-party apps like Spotify requires their own APIs or deep links, which is a documented future integration.',
  },
  {
    q: 'What happens with sensitive actions?',
    a: 'Anything sensitive (like sending a message) always creates an approval request first. Nothing runs until you explicitly approve it from the Assistant or a notification.',
  },
  {
    q: 'Where does my data go?',
    a: 'Your data lives in your own backend database. Only your backend talks to the AI provider (OpenAI or a local model) - the app never calls it directly and never bundles an API key.',
  },
];

export default function AboutScreen() {
  return (
    <ScrollView className={tw.screen} contentContainerClassName="px-5 pt-4 pb-10">
      <Card className="mb-5 items-center py-6">
        <Text className="text-4xl mb-2">🎙️</Text>
        <Text className={tw.subheading}>Personal Agent</Text>
        <Text className={`${tw.textMuted} mt-1`}>Version {Constants.expoConfig?.version ?? '1.0.0'}</Text>
      </Card>

      <Text className={`${tw.label} mb-2`}>Frequently asked questions</Text>
      <View className="gap-2 mb-6">
        {FAQ.map((item) => (
          <Card key={item.q}>
            <Text className={`${tw.textPrimary} font-medium mb-1.5`}>{item.q}</Text>
            <Text className={`${tw.textSecondary} text-sm`}>{item.a}</Text>
          </Card>
        ))}
      </View>

      <Text className={`${tw.label} mb-2`}>Support</Text>
      <Pressable onPress={() => Linking.openURL('https://github.com')}>
        <Card>
          <Text className={tw.textPrimary}>View documentation & source</Text>
        </Card>
      </Pressable>
    </ScrollView>
  );
}
