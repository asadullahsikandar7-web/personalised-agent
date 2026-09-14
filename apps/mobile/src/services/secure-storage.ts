import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'personal_agent.access_token';
const REFRESH_TOKEN_KEY = 'personal_agent.refresh_token';

/**
 * Thin wrapper around Expo SecureStore (Android Keystore / iOS Keychain backed) so tokens never
 * touch AsyncStorage or plain JS memory persistence. See docs/permissions-and-security.md.
 */
export const secureStorage = {
  async getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  },
  async getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  },
  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
      SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
    ]);
  },
  async clearTokens(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    ]);
  },
};
