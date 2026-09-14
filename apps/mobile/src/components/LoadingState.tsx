import { View, ActivityIndicator, Text } from 'react-native';
import { tw } from '../theme/tw';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <View className="items-center justify-center py-16">
      <ActivityIndicator size="large" color="#6C5CE7" />
      <Text className={`${tw.textMuted} mt-3`}>{label}</Text>
    </View>
  );
}
