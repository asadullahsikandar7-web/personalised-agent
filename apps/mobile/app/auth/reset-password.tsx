import { useState } from 'react';
import { Text, SafeAreaView, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema, type ResetPasswordInput } from '@personal-agent/shared';
import { tw } from '../../src/theme/tw';
import { Button, TextField } from '../../src/components';
import { api } from '../../src/services/api-client';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token: params.token ?? '', password: '' },
  });

  const onSubmit = async (data: ResetPasswordInput) => {
    setSubmitError(null);
    try {
      await api.post('/api/auth/reset-password', data, { skipAuth: true });
      setSuccess(true);
      setTimeout(() => router.replace('/auth/login'), 1200);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unable to reset your password.');
    }
  };

  return (
    <SafeAreaView className={tw.screen}>
      <ScrollView contentContainerClassName="px-6 pt-10 pb-6" keyboardShouldPersistTaps="handled">
        <Text className={tw.heading}>Set a new password</Text>
        <Text className={`${tw.textSecondary} mt-1 mb-8`}>Choose a strong password for your account.</Text>

        {success ? (
          <Text className={tw.textPrimary}>Password reset. Redirecting to login…</Text>
        ) : (
          <>
            <Controller
              control={control}
              name="token"
              render={({ field: { onChange, value } }) => (
                <TextField label="Reset token" value={value} onChangeText={onChange} error={errors.token?.message} />
              )}
            />
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextField
                  label="New password"
                  secureTextEntry
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.password?.message}
                />
              )}
            />
            {submitError ? <Text className={`${tw.errorText} mb-3`}>{submitError}</Text> : null}
            <Button label="Reset password" onPress={handleSubmit(onSubmit)} loading={isSubmitting} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
