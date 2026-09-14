import { api } from '../../services/api-client';
import { secureStorage } from '../../services/secure-storage';
import { useAuthStore } from '../auth-store';

jest.mock('../../services/api-client', () => ({
  api: { get: jest.fn(), post: jest.fn() },
  registerSessionExpiredHandler: jest.fn(),
}));

const mockUser = { id: 'u1', email: 'a@b.com', name: 'A', timezone: 'UTC', createdAt: new Date().toISOString() };

describe('auth-store', () => {
  beforeEach(async () => {
    await secureStorage.clearTokens();
    useAuthStore.setState({ status: 'idle', user: null, error: null });
    jest.clearAllMocks();
  });

  it('starts unauthenticated when no token is stored', async () => {
    await useAuthStore.getState().restoreSession();
    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });

  it('restores an authenticated session when a token exists and /me succeeds', async () => {
    await secureStorage.setTokens('access-token', 'refresh-token');
    (api.get as jest.Mock).mockResolvedValueOnce(mockUser);

    await useAuthStore.getState().restoreSession();

    expect(useAuthStore.getState().status).toBe('authenticated');
    expect(useAuthStore.getState().user).toEqual(mockUser);
  });

  it('falls back to unauthenticated and clears tokens if /me fails', async () => {
    await secureStorage.setTokens('access-token', 'refresh-token');
    (api.get as jest.Mock).mockRejectedValueOnce(new Error('unauthorized'));

    await useAuthStore.getState().restoreSession();

    expect(useAuthStore.getState().status).toBe('unauthenticated');
    expect(await secureStorage.getAccessToken()).toBeNull();
  });

  it('logs in successfully and stores tokens', async () => {
    (api.post as jest.Mock).mockResolvedValueOnce({
      user: mockUser,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    await useAuthStore.getState().login('a@b.com', 'password123');

    expect(useAuthStore.getState().status).toBe('authenticated');
    expect(useAuthStore.getState().user).toEqual(mockUser);
    expect(await secureStorage.getAccessToken()).toBe('access-token');
  });

  it('surfaces a login error without authenticating', async () => {
    (api.post as jest.Mock).mockRejectedValueOnce(new Error('Invalid email or password'));

    await expect(useAuthStore.getState().login('a@b.com', 'wrong')).rejects.toThrow();
    expect(useAuthStore.getState().status).not.toBe('authenticated');
    expect(useAuthStore.getState().error).toBe('Invalid email or password');
  });

  it('clears tokens and resets state on logout', async () => {
    await secureStorage.setTokens('access-token', 'refresh-token');
    useAuthStore.setState({ status: 'authenticated', user: mockUser });
    (api.post as jest.Mock).mockResolvedValueOnce({});

    await useAuthStore.getState().logout();

    expect(useAuthStore.getState().status).toBe('unauthenticated');
    expect(useAuthStore.getState().user).toBeNull();
    expect(await secureStorage.getAccessToken()).toBeNull();
  });
});
