import { useCallback, useRef, useState } from 'react';
import type {
  ExpoSpeechRecognitionModule as ExpoSpeechRecognitionModuleType,
  ExpoSpeechRecognitionResultEvent,
  ExpoSpeechRecognitionErrorEvent,
  useSpeechRecognitionEvent as UseSpeechRecognitionEventType,
} from 'expo-speech-recognition';

// expo-speech-recognition ships real native code. Merely *importing* it throws synchronously
// when the native module isn't linked into the running binary (e.g. Expo Go, which cannot load
// third-party native modules) - not just when a method is called. A static top-level import
// would therefore crash this whole file (and the Assistant screen that imports it) before any
// of our own try/catch logic ever runs. Loading it lazily behind a try/catch, with a no-op
// fallback for the hook, keeps the rest of this file - and the Rules of Hooks, since
// useSpeechRecognitionEvent is still called the same number of times on every render - intact
// either way. See docs/known-platform-limitations.md.
let ExpoSpeechRecognitionModule: typeof ExpoSpeechRecognitionModuleType | null = null;
let useSpeechRecognitionEvent: typeof UseSpeechRecognitionEventType = () => {
  /* no-op until the native module is confirmed available */
};
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- must be lazy, see above
  const nativeModule = require('expo-speech-recognition');
  ExpoSpeechRecognitionModule = nativeModule.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = nativeModule.useSpeechRecognitionEvent;
} catch {
  ExpoSpeechRecognitionModule = null;
}

export type VoiceRecognitionStatus =
  | 'idle'
  | 'requesting_permission'
  | 'listening'
  | 'unavailable'
  | 'permission_denied'
  | 'error';

interface UseVoiceRecognitionResult {
  status: VoiceRecognitionStatus;
  transcript: string;
  errorMessage: string | null;
  start: () => Promise<void>;
  stop: () => void;
  abort: () => void;
  reset: () => void;
}

/**
 * Wraps expo-speech-recognition (native on-device/OS speech-to-text). This only works in a
 * development build or a production build - NOT inside Expo Go. When the native module cannot
 * be reached, `status` becomes 'unavailable' and the caller should fall back to typed text input
 * - see the assistant screen and docs/known-platform-limitations.md.
 */
export function useVoiceRecognition(): UseVoiceRecognitionResult {
  const [status, setStatus] = useState<VoiceRecognitionStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const moduleAvailable = useRef(ExpoSpeechRecognitionModule !== null);

  useSpeechRecognitionEvent('result', (event: ExpoSpeechRecognitionResultEvent) => {
    const best = event.results[0]?.transcript;
    if (best) setTranscript(best);
  });

  useSpeechRecognitionEvent('end', () => {
    setStatus((prev) => (prev === 'listening' ? 'idle' : prev));
  });

  useSpeechRecognitionEvent('error', (event: ExpoSpeechRecognitionErrorEvent) => {
    setErrorMessage(event.message ?? event.error ?? 'Speech recognition error');
    setStatus('error');
  });

  const start = useCallback(async () => {
    setErrorMessage(null);
    setTranscript('');

    if (!ExpoSpeechRecognitionModule) {
      moduleAvailable.current = false;
      setStatus('unavailable');
      setErrorMessage('Voice input is not available in this build (normal for Expo Go).');
      return;
    }

    setStatus('requesting_permission');
    try {
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) {
        setStatus('permission_denied');
        return;
      }
      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous: false,
        addsPunctuation: true,
      });
      setStatus('listening');
    } catch (err) {
      // Thrown when the native module isn't linked into this binary (e.g. running in Expo Go).
      moduleAvailable.current = false;
      setStatus('unavailable');
      setErrorMessage(
        err instanceof Error ? err.message : 'Voice input is not available in this build.',
      );
    }
  }, []);

  const stop = useCallback(() => {
    if (!moduleAvailable.current || !ExpoSpeechRecognitionModule) return;
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      // no-op - module already unavailable
    }
  }, []);

  const abort = useCallback(() => {
    if (moduleAvailable.current && ExpoSpeechRecognitionModule) {
      try {
        ExpoSpeechRecognitionModule.abort();
      } catch {
        // no-op
      }
    }
    setStatus('idle');
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setErrorMessage(null);
    setStatus('idle');
  }, []);

  return { status, transcript, errorMessage, start, stop, abort, reset };
}
