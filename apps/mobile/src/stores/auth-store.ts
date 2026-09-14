import { create } from 'zustand';
import type { PublicUser } from '@personal-agent/shared';
import { api } from '../services/api-client';
import { secureStorage } from '../services/secure-storage';
import { registerSessionExpiredHandler } from '../services/api-client';

interface AuthState {
  status: 'idle' | 'restoring' | 'authenticated' | 'unauthenticated';
  user: PublicUser | null;
  error: string | null;
  restoreSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'idle',
  user: null,
  error: null,

  restoreSession: async () => {
    set({ status: 'restoring' });
    const accessToken = await secureStorage.getAccessToken();
    if (!accessToken) {
      set({ status: 'unauthenticated' });
      return;
    }
    try {
      const user = await api.get<PublicUser>('/api/auth/me');
      set({ status: 'authenticated', user });
    } catch {
      await secureStorage.clearTokens();
      set({ status: 'unauthenticated', user: null });
    }
  },

  login: async (email, password) => {
    set({ error: null });
    try {
      const data = await api.post<{ user: PublicUser; accessToken: string; refreshToken: string }>(
        '/api/auth/login',
        { email, password },
        { skipAuth: true },
      );
      await secureStorage.setTokens(data.accessToken, data.refreshToken);
      set({ status: 'authenticated', user: data.user });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to log in.' });
      throw err;
    }
  },

  register: async (email, password, name) => {
    set({ error: null });
    try {
      const data = await api.post<{ user: PublicUser; accessToken: string; refreshToken: string }>(
        '/api/auth/register',
        { email, password, name },
        { skipAuth: true },
      );
      await secureStorage.setTokens(data.accessToken, data.refreshToken);
      set({ status: 'authenticated', user: data.user });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to create an account.' });
      throw err;
    }
  },

  logout: async () => {
    const refreshToken = await secureStorage.getRefreshToken();
    await secureStorage.clearTokens();
    set({ status: 'unauthenticated', user: null });
    if (refreshToken) {
      api.post('/api/auth/logout', { refreshToken }, { skipAuth: true }).catch(() => undefined);
    }
  },

  clearError: () => set({ error: null }),
}));

// If the API client fails to refresh a session, force the store back to unauthenticated so
// protected routes redirect to /auth/welcome instead of showing stale data.
registerSessionExpiredHandler(() => {
  useAuthStore.setState({ status: 'unauthenticated', user: null });
});
