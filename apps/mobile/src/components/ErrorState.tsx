import { View, Text } from 'react-native';
import { tw } from '../theme/tw';
import { Button } from './Button';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = 'Something went wrong loading this.', onRetry }: ErrorStateProps) {
  return (
    <View className="items-center justify-center py-16 px-6">
      <Text className={`${tw.badgeDangerText} text-base font-semibold`}>Error</Text>
      <Text className={`${tw.textMuted} text-center mt-2`}>{message}</Text>
      {onRetry ? (
        <View className="mt-5 w-full max-w-xs">
          <Button label="Retry" onPress={onRetry} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}
