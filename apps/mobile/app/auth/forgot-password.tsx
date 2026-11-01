import { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@personal-agent/shared';
import { tw } from '../../src/theme/tw';
import { Button, TextField } from '../../src/components';
import { api } from '../../src/services/api-client';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: '' } });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setSubmitError(null);
    try {
      const result = await api.post<{ message: string; devResetToken?: string }>(
        '/api/auth/forgot-password',
        data,
        { skipAuth: true },
      );
      setSent(true);
      if (result.devResetToken) {
        // Local development convenience only - no email delivery is configured. See docs/setup.md.
        router.push({ pathname: '/auth/reset-password', params: { token: result.devResetToken } });
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  return (
    <SafeAreaView className={tw.screen}>
      <ScrollView contentContainerClassName="px-6 pt-10 pb-6" keyboardShouldPersistTaps="handled">
        <Text className={tw.heading}>Reset your password</Text>
        <Text className={`${tw.textSecondary} mt-1 mb-8`}>
          Enter your email and we&apos;ll send you a link to reset your password.
        </Text>

        {sent ? (
          <View className={tw.card}>
            <Text className={tw.textPrimary}>
              If an account with that email exists, a reset link has been sent.
            </Text>
          </View>
        ) : (
          <>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextField
                  label="Email"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.email?.message}
                />
              )}
            />
            {submitError ? <Text className={`${tw.errorText} mb-3`}>{submitError}</Text> : null}
            <Button label="Send reset link" onPress={handleSubmit(onSubmit)} loading={isSubmitting} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
