import { View, type ViewProps } from 'react-native';
import { tw } from '../theme/tw';

export function Card({ className, children, ...rest }: ViewProps & { className?: string }) {
  return (
    <View className={`${tw.card} ${className ?? ''}`} {...rest}>
      {children}
    </View>
  );
}
