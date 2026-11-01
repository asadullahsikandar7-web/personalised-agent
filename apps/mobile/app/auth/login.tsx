import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@personal-agent/shared';
import { tw } from '../../src/theme/tw';
import { Button, TextField } from '../../src/components';
import { useAuthStore } from '../../src/stores/auth-store';

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  const onSubmit = async (data: LoginInput) => {
    setSubmitError(null);
    try {
      await login(data.email, data.password);
      router.replace('/');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unable to log in. Please try again.');
    }
  };

  return (
    <SafeAreaView className={tw.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerClassName="px-6 pt-10 pb-6" keyboardShouldPersistTaps="handled">
          <Text className={tw.heading}>Welcome back</Text>
          <Text className={`${tw.textSecondary} mt-1 mb-8`}>Sign in to continue to your assistant.</Text>

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextField
                label="Email"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
                testID="login-email"
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextField
                label="Password"
                secureTextEntry
                autoComplete="password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
                testID="login-password"
              />
            )}
          />

          {submitError ? <Text className={`${tw.errorText} mb-3`}>{submitError}</Text> : null}

          <Button label="Log in" onPress={handleSubmit(onSubmit)} loading={isSubmitting} testID="login-submit" />

          <View className="flex-row justify-center mt-5">
            <Link href="/auth/forgot-password">
              <Text className={`${tw.textSecondary} underline`}>Forgot password?</Text>
            </Link>
          </View>
          <View className="flex-row justify-center mt-3 gap-1">
            <Text className={tw.textSecondary}>Don&apos;t have an account?</Text>
            <Link href="/auth/register">
              <Text className="text-light-primary dark:text-dark-primary font-semibold">Sign up</Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
