import { View, Text, TextInput, type TextInputProps } from 'react-native';
import { tw } from '../theme/tw';

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
}

export function TextField({ label, error, className, ...rest }: TextFieldProps & { className?: string }) {
  return (
    <View className="mb-4">
      <Text className={`${tw.label} mb-1.5`}>{label}</Text>
      <TextInput
        placeholderTextColor="#8B8D98"
        accessibilityLabel={label}
        className={`${tw.input} ${error ? tw.inputError : ''} ${className ?? ''}`}
        {...rest}
      />
      {error ? <Text className={tw.errorText}>{error}</Text> : null}
    </View>
  );
}
