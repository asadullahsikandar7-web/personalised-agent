import { Pressable, Text, ActivityIndicator, type GestureResponderEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import { tw } from '../theme/tw';

interface ButtonProps {
  label: string;
  onPress: (e: GestureResponderEvent) => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  testID?: string;
  haptics?: boolean;
}

const VARIANT_STYLES: Record<NonNullable<ButtonProps['variant']>, { container: string; text: string }> = {
  primary: { container: tw.buttonPrimary, text: tw.buttonPrimaryText },
  secondary: { container: tw.buttonSecondary, text: tw.buttonSecondaryText },
  danger: { container: tw.buttonDanger, text: tw.buttonPrimaryText },
  ghost: { container: tw.buttonGhost, text: tw.buttonGhostText },
};

/** The one button component every screen uses - guarantees consistent tap feedback, loading and
 * disabled states so no screen ships a button that silently does nothing. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = true,
  testID,
  haptics = true,
}: ButtonProps) {
  const styles = VARIANT_STYLES[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      testID={testID}
      disabled={isDisabled}
      onPress={(e) => {
        if (haptics) Haptics.selectionAsync().catch(() => undefined);
        onPress(e);
      }}
      className={`${styles.container} ${fullWidth ? 'w-full' : ''} ${isDisabled ? 'opacity-50' : ''}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' || variant === 'ghost' ? '#6C5CE7' : '#FFFFFF'} />
      ) : (
        <Text className={styles.text}>{label}</Text>
      )}
    </Pressable>
  );
}
