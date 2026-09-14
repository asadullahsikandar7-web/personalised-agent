import { useAuthStore } from '../stores/auth-store';

/** Convenience hook mirroring the spec's `useCurrentUser` - backed by the auth store, which
 * already keeps the session hydrated and refreshed. */
export function useCurrentUser() {
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  return { user, isLoading: status === 'restoring' || status === 'idle', isAuthenticated: status === 'authenticated' };
}
