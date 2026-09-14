import { View, Text } from 'react-native';
import { tw } from '../theme/tw';

export function ScreenHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View className="mb-4 mt-2">
      <Text className={tw.heading}>{title}</Text>
      {subtitle ? <Text className={`${tw.textSecondary} mt-1`}>{subtitle}</Text> : null}
    </View>
  );
}
