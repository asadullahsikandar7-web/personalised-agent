import { View, Text } from 'react-native';
import { tw } from '../theme/tw';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Every list screen renders this instead of a blank area when there is no data yet. */
export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View className="items-center justify-center py-16 px-6">
      <Text className={`${tw.subheading} text-center`}>{title}</Text>
      {description ? <Text className={`${tw.textMuted} text-center mt-2`}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <View className="mt-5 w-full max-w-xs">
          <Button label={actionLabel} onPress={onAction} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}
