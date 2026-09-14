import { renderHook, act } from '@testing-library/react-native';
import { useVoiceRecognition } from '../useVoiceRecognition';

const mockStart = jest.fn();
const mockStop = jest.fn();
const mockAbort = jest.fn();
const mockRequestPermissions = jest.fn();

jest.mock('expo-speech-recognition', () => ({
  ExpoSpeechRecognitionModule: {
    start: (...args: unknown[]) => mockStart(...args),
    stop: (...args: unknown[]) => mockStop(...args),
    abort: (...args: unknown[]) => mockAbort(...args),
    requestPermissionsAsync: (...args: unknown[]) => mockRequestPermissions(...args),
  },
  useSpeechRecognitionEvent: jest.fn(),
}));

describe('useVoiceRecognition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts in the idle state', async () => {
    const { result } = await renderHook(() => useVoiceRecognition());
    expect(result.current.status).toBe('idle');
    expect(result.current.transcript).toBe('');
  });

  it('transitions to listening once permission is granted and start() succeeds', async () => {
    mockRequestPermissions.mockResolvedValue({ granted: true });
    const { result } = await renderHook(() => useVoiceRecognition());

    await act(async () => {
      await result.current.start();
    });

    expect(mockStart).toHaveBeenCalled();
    expect(result.current.status).toBe('listening');
  });

  it('moves to permission_denied when the user declines the permission dialog', async () => {
    mockRequestPermissions.mockResolvedValue({ granted: false });
    const { result } = await renderHook(() => useVoiceRecognition());

    await act(async () => {
      await result.current.start();
    });

    expect(mockStart).not.toHaveBeenCalled();
    expect(result.current.status).toBe('permission_denied');
  });

  it('falls back to "unavailable" when the native module throws (e.g. running in Expo Go)', async () => {
    mockRequestPermissions.mockRejectedValue(new Error("Cannot find native module 'ExpoSpeechRecognition'"));
    const { result } = await renderHook(() => useVoiceRecognition());

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.status).toBe('unavailable');
    expect(result.current.errorMessage).toContain('ExpoSpeechRecognition');
  });

  it('reset() clears transcript, error, and returns to idle', async () => {
    mockRequestPermissions.mockRejectedValue(new Error('unavailable'));
    const { result } = await renderHook(() => useVoiceRecognition());
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.status).toBe('unavailable');

    await act(() => result.current.reset());
    expect(result.current.status).toBe('idle');
    expect(result.current.errorMessage).toBeNull();
  });
});
