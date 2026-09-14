import { useCallback, useRef, useState } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

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
 * Wraps expo-speech-recognition (native on-device/OS speech-to-text). This is a community
 * package that ships real native code, so it only works in a development build or a production
 * build - NOT inside Expo Go, which cannot load third-party native modules. When the native
 * module cannot be reached (Expo Go, or a platform without support), `status` becomes
 * 'unavailable' and the caller should fall back to typed text input - see the assistant screen
 * and docs/known-platform-limitations.md.
 */
export function useVoiceRecognition(): UseVoiceRecognitionResult {
  const [status, setStatus] = useState<VoiceRecognitionStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const moduleAvailable = useRef(true);

  useSpeechRecognitionEvent('result', (event) => {
    const best = event.results[0]?.transcript;
    if (best) setTranscript(best);
  });

  useSpeechRecognitionEvent('end', () => {
    setStatus((prev) => (prev === 'listening' ? 'idle' : prev));
  });

  useSpeechRecognitionEvent('error', (event) => {
    setErrorMessage(event.message ?? event.error ?? 'Speech recognition error');
    setStatus('error');
  });

  const start = useCallback(async () => {
    setErrorMessage(null);
    setTranscript('');
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
    if (!moduleAvailable.current) return;
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      // no-op - module already unavailable
    }
  }, []);

  const abort = useCallback(() => {
    if (!moduleAvailable.current) return;
    try {
      ExpoSpeechRecognitionModule.abort();
    } catch {
      // no-op
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
