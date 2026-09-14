import { View, Text } from 'react-native';
import { tw } from '../theme/tw';

type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral';

const TONE_STYLES: Record<BadgeTone, { container: string; text: string }> = {
  success: { container: tw.badgeSuccess, text: tw.badgeSuccessText },
  warning: { container: tw.badgeWarning, text: tw.badgeWarningText },
  danger: { container: tw.badgeDanger, text: tw.badgeDangerText },
  neutral: { container: tw.pill, text: tw.pillText },
};

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  const styles = TONE_STYLES[tone];
  return (
    <View className={styles.container}>
      <Text className={styles.text}>{label}</Text>
    </View>
  );
}
