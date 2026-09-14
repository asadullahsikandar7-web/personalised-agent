import { Text } from 'react-native';
import { Link } from 'expo-router';
import { tw } from '../src/theme/tw';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NotFoundScreen() {
  return (
    <SafeAreaView className={`${tw.screen} items-center justify-center px-6`}>
      <Text className={tw.heading}>Page not found</Text>
      <Text className={`${tw.textSecondary} text-center mt-2 mb-6`}>
        This screen doesn&apos;t exist.
      </Text>
      <Link href="/" className="text-light-primary dark:text-dark-primary font-semibold">
        Go to Home
      </Link>
    </SafeAreaView>
  );
}
