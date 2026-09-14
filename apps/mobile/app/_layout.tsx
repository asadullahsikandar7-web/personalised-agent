import '../src/theme/global.css';
import { useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { Slot } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../src/services/query-client';
import { useAuthStore } from '../src/stores/auth-store';
import { useUIStore } from '../src/stores/ui-store';
import { useProtectedRoute } from '../src/navigation/useProtectedRoute';
import { tw } from '../src/theme/tw';

export { ErrorBoundary } from '../src/components/ErrorBoundary';

function AppGate({ children }: { children: React.ReactNode }) {
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const status = useAuthStore((s) => s.status);
  const hydrateTheme = useUIStore((s) => s.hydrateTheme);
  const themeHydrated = useUIStore((s) => s.hydrated);

  useEffect(() => {
    restoreSession();
    hydrateTheme();
  }, [restoreSession, hydrateTheme]);

  useProtectedRoute();

  if (status === 'idle' || status === 'restoring' || !themeHydrated) {
    return (
      <View className={`${tw.screen} items-center justify-center`}>
        <ActivityIndicator size="large" color="#6C5CE7" />
        <Text className={`${tw.textSecondary} mt-4`}>Loading Personal Agent…</Text>
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AppGate>
            <Slot />
          </AppGate>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
