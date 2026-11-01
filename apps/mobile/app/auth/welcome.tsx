import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { tw } from '../../src/theme/tw';
import { Button } from '../../src/components';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className={tw.screen}>
      <View className="flex-1 px-6 justify-between py-10">
        <View className="items-center mt-16">
          <View className="w-20 h-20 rounded-3xl bg-light-primary dark:bg-dark-primary items-center justify-center mb-6">
            <Text className="text-4xl">🎙️</Text>
          </View>
          <Text className={`${tw.heading} text-center`}>Personal Agent</Text>
          <Text className={`${tw.textSecondary} text-center mt-3 px-4`}>
            A private, voice-first AI assistant that remembers what matters, manages your tasks
            and reminders, and executes only what you approve.
          </Text>
        </View>

        <View className="gap-3">
          <Button
            label="Create an account"
            onPress={() => router.push('/auth/register')}
            testID="get-started-button"
          />
          <Button
            label="I already have an account"
            onPress={() => router.push('/auth/login')}
            variant="secondary"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
