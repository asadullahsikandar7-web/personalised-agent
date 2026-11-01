import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@personal-agent/shared';
import { tw } from '../../src/theme/tw';
import { Button, TextField } from '../../src/components';
import { useAuthStore } from '../../src/stores/auth-store';

export default function RegisterScreen() {
  const router = useRouter();
  const registerUser = useAuthStore((s) => s.register);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', name: '' },
  });

  const onSubmit = async (data: RegisterInput) => {
    setSubmitError(null);
    try {
      await registerUser(data.email, data.password, data.name);
      router.replace('/');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unable to create your account.');
    }
  };

  return (
    <SafeAreaView className={tw.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView contentContainerClassName="px-6 pt-10 pb-6" keyboardShouldPersistTaps="handled">
          <Text className={tw.heading}>Create your account</Text>
          <Text className={`${tw.textSecondary} mt-1 mb-8`}>It only takes a minute.</Text>

          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextField
                label="Name"
                autoCapitalize="words"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.name?.message}
                testID="register-name"
              />
            )}
          />
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
                testID="register-email"
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
                autoComplete="password-new"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
                testID="register-password"
              />
            )}
          />

          {submitError ? <Text className={`${tw.errorText} mb-3`}>{submitError}</Text> : null}

          <Button label="Create account" onPress={handleSubmit(onSubmit)} loading={isSubmitting} testID="register-submit" />

          <View className="flex-row justify-center mt-5 gap-1">
            <Text className={tw.textSecondary}>Already have an account?</Text>
            <Link href="/auth/login">
              <Text className="text-light-primary dark:text-dark-primary font-semibold">Log in</Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
