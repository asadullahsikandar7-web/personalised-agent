import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorScheme as nativewindColorScheme } from 'nativewind';

export type ThemePreference = 'system' | 'light' | 'dark';

const THEME_STORAGE_KEY = 'personal_agent.theme_preference';

interface UIState {
  themePreference: ThemePreference;
  hydrated: boolean;
  hydrateTheme: () => Promise<void>;
  setThemePreference: (mode: ThemePreference) => Promise<void>;
}

export const useUIStore = create<UIState>((set) => ({
  themePreference: 'system',
  hydrated: false,

  hydrateTheme: async () => {
    try {
      const stored = (await AsyncStorage.getItem(THEME_STORAGE_KEY)) as ThemePreference | null;
      const mode = stored ?? 'system';
      nativewindColorScheme.set(mode);
      set({ themePreference: mode, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  setThemePreference: async (mode) => {
    nativewindColorScheme.set(mode);
    set({ themePreference: mode });
    await AsyncStorage.setItem(THEME_STORAGE_KEY, mode).catch(() => undefined);
  },
}));
