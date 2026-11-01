import { ScrollView, Pressable, Text } from 'react-native';
import { tw } from '../theme/tw';

/** A horizontally scrolling row of tappable suggestion chips. */
export function QuickReplies({
  items,
  onPick,
  disabled,
}: {
  items: { key: string; label: string }[];
  onPick: (key: string) => void;
  disabled?: boolean;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-5" keyboardShouldPersistTaps="handled">
      {items.map((item) => (
        <Pressable
          key={item.key}
          accessibilityRole="button"
          disabled={disabled}
          onPress={() => onPick(item.key)}
          className={`${tw.pill} py-2 ${disabled ? 'opacity-40' : ''}`}
        >
          <Text className={tw.pillText}>{item.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
