import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useMusicCatalogSearch } from '../useMusicCatalogSearch';

const mockGet = jest.fn();

jest.mock('../../services/api-client', () => ({
  api: { get: (...args: unknown[]) => mockGet(...args) },
}));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useMusicCatalogSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not call the API when no search field is given', async () => {
    const { result } = await renderHook(() => useMusicCatalogSearch({}), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('calls the API with the given fields once at least one is provided', async () => {
    mockGet.mockResolvedValue({ results: [], providersQueried: [], providersFailed: [] });
    const { result } = await renderHook(() => useMusicCatalogSearch({ artist: 'Nusrat Fateh Ali Khan' }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGet).toHaveBeenCalledWith(
      '/api/music-search',
      expect.objectContaining({ artist: 'Nusrat Fateh Ali Khan' }),
    );
  });
});
