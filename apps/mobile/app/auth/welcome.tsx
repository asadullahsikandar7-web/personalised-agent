import { View, Text, SafeAreaView } from 'react-native';
import { Link } from 'expo-router';
import { tw } from '../../src/theme/tw';
import { Button } from '../../src/components';

export default function WelcomeScreen() {
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
          <Link href="/auth/register" asChild>
            <Button label="Create an account" onPress={() => {}} testID="get-started-button" />
          </Link>
          <Link href="/auth/login" asChild>
            <Button label="I already have an account" onPress={() => {}} variant="secondary" />
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
}
