import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '../stores/auth-store';

/**
 * Central auth guard. Runs on every navigation state change: if the user is signed out and
 * inside the protected (app) group, redirect to the welcome screen; if signed in and still on
 * an auth screen, redirect into the app. Mirrors the standard Expo Router protected-routes
 * pattern so it works regardless of the installed router's exact version.
 */
export function useProtectedRoute() {
  const segments = useSegments();
  const router = useRouter();
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    if (status === 'idle' || status === 'restoring') return;

    const inAuthGroup = segments[0] === 'auth';
    const isAuthenticated = status === 'authenticated';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/auth/welcome');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/');
    }
  }, [status, segments, router]);
}
