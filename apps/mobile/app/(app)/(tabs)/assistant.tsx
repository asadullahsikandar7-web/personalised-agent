import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';
import * as Speech from 'expo-speech';
import { tw } from '../../../src/theme/tw';
import { Button, Card, Badge } from '../../../src/components';
import { useVoiceRecognition } from '../../../src/hooks/useVoiceRecognition';
import { useSendAgentMessage, type AgentReplyResult } from '../../../src/hooks/useSendAgentMessage';
import { useApproveRequest, useRejectRequest } from '../../../src/hooks/useApprovals';
import { useUserPreferences } from '../../../src/hooks/useUserPreferences';
import type { AssistantPhase } from '../../../src/features/assistant/types';

export default function AssistantScreen() {
  const [phase, setPhase] = useState<AssistantPhase>('idle');
  const [transcript, setTranscript] = useState('');
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [result, setResult] = useState<AgentReplyResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [voiceUnavailable, setVoiceUnavailable] = useState(false);

  const voice = useVoiceRecognition();
  const sendMessage = useSendAgentMessage();
  const approve = useApproveRequest();
  const reject = useRejectRequest();
  const preferences = useUserPreferences();

  const pulse = useSharedValue(1);
  useEffect(() => {
    if (phase === 'listening') {
      pulse.value = withRepeat(withSequence(withTiming(1.15, { duration: 500 }), withTiming(1, { duration: 500 })), -1, true);
    } else {
      pulse.value = withTiming(1, { duration: 200 });
    }
  }, [phase, pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  useEffect(() => {
    if (voice.status === 'unavailable' || voice.status === 'permission_denied') {
      setVoiceUnavailable(true);
      setPhase('idle');
    } else if (voice.status === 'listening') {
      setPhase('listening');
    } else if (voice.status === 'idle' && phase === 'listening') {
      // Recognition ended on its own - move to review with whatever we captured.
      setTranscript(voice.transcript);
      setPhase(voice.transcript.trim() ? 'review' : 'idle');
    } else if (voice.status === 'error') {
      setErrorMessage(voice.errorMessage);
      setPhase('idle');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.status]);

  useEffect(() => {
    if (phase === 'listening') setTranscript(voice.transcript);
  }, [voice.transcript, phase]);

  const handleMicPress = useCallback(async () => {
    setErrorMessage(null);
    await voice.start();
  }, [voice]);

  const handleStopListening = useCallback(() => {
    voice.stop();
  }, [voice]);

  const handleCancel = useCallback(() => {
    voice.abort();
    setTranscript('');
    setResult(null);
    setPhase('idle');
  }, [voice]);

  const handleSend = useCallback(
    async (source: 'text' | 'voice') => {
      if (!transcript.trim()) return;
      setPhase('processing');
      setErrorMessage(null);
      try {
        const data = await sendMessage.mutateAsync({ message: transcript, conversationId, source });
        setConversationId(data.conversationId);
        setResult(data);
        setTranscript('');

        if (data.pendingApprovalIds.length > 0) {
          setPhase('awaiting_approval');
        } else {
          setPhase('success');
          if (preferences.data?.ttsEnabled !== false) {
            Speech.speak(data.assistantMessage.content, { rate: 1.0 });
          }
        }
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
        setPhase('error');
      }
    },
    [transcript, conversationId, sendMessage, preferences.data?.ttsEnabled],
  );

  const handleApprovalDecision = useCallback(
    async (approvalId: string, decision: 'approve' | 'reject') => {
      try {
        if (decision === 'approve') await approve.mutateAsync(approvalId);
        else await reject.mutateAsync(approvalId);
        setPhase('success');
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Could not process your decision.');
      }
    },
    [approve, reject],
  );

  const askAgain = useCallback(() => {
    setResult(null);
    setTranscript('');
    setPhase('idle');
  }, []);

  return (
    <SafeAreaView className={tw.screen} edges={['top']}>
      <ScrollView contentContainerClassName="px-6 pb-10 flex-grow" keyboardShouldPersistTaps="handled">
        <Text className={`${tw.heading} mt-3 mb-1`}>Assistant</Text>
        <Text className={`${tw.textSecondary} mb-6`}>Speak naturally or type your request.</Text>

        {voiceUnavailable && phase === 'idle' && (
          <Card className="mb-5 bg-light-warning/10 dark:bg-dark-warning/10 border-light-warning/30 dark:border-dark-warning/30">
            <Text className={`${tw.textPrimary} text-sm`}>
              On-device voice recognition isn&apos;t available in this build (this is normal in
              Expo Go - it requires a custom development build). Use the text box below instead.
            </Text>
          </Card>
        )}

        <View className="items-center my-8">
          <Animated.View style={phase === 'listening' ? pulseStyle : undefined}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={phase === 'listening' ? 'Stop listening' : 'Start listening'}
              disabled={voiceUnavailable || phase === 'processing'}
              onPress={phase === 'listening' ? handleStopListening : handleMicPress}
              className={`w-28 h-28 rounded-full items-center justify-center ${
                phase === 'listening' ? 'bg-light-danger dark:bg-dark-danger' : 'bg-light-primary dark:bg-dark-primary'
              } ${voiceUnavailable ? 'opacity-40' : ''}`}
            >
              <Text className="text-5xl">{phase === 'listening' ? '⏹️' : '🎙️'}</Text>
            </Pressable>
          </Animated.View>
          <Text className={`${tw.textMuted} mt-3`}>
            {phase === 'idle' && 'Tap to speak'}
            {phase === 'listening' && 'Listening… tap to stop'}
            {phase === 'processing' && 'Thinking…'}
          </Text>
        </View>

        {(phase === 'review' || phase === 'listening') && (
          <View className="mb-5">
            <Text className={`${tw.label} mb-1.5`}>{phase === 'listening' ? 'Hearing you say…' : 'Confirm or edit'}</Text>
            <TextInput
              value={transcript}
              onChangeText={setTranscript}
              editable={phase === 'review'}
              multiline
              className={tw.input}
              placeholder="What you said will appear here"
              placeholderTextColor="#8B8D98"
            />
            {phase === 'review' && (
              <View className="flex-row gap-3 mt-3">
                <View className="flex-1">
                  <Button label="Cancel" variant="ghost" onPress={handleCancel} />
                </View>
                <View className="flex-1">
                  <Button label="Send" onPress={() => handleSend('voice')} disabled={!transcript.trim()} />
                </View>
              </View>
            )}
          </View>
        )}

        {phase === 'idle' && (
          <View className="mb-5">
            <Text className={`${tw.label} mb-1.5`}>Or type a command</Text>
            <TextInput
              value={transcript}
              onChangeText={setTranscript}
              multiline
              className={tw.input}
              placeholder="e.g. Remind me to call mom at 6 PM"
              placeholderTextColor="#8B8D98"
              testID="assistant-text-input"
            />
            <View className="mt-3">
              <Button
                label="Send"
                onPress={() => handleSend('text')}
                disabled={!transcript.trim()}
                testID="assistant-send-button"
              />
            </View>
          </View>
        )}

        {phase === 'processing' && (
          <View className="items-center py-6">
            <ActivityIndicator size="large" color="#6C5CE7" />
          </View>
        )}

        {errorMessage && (
          <Card className="mb-5 bg-light-danger/10 dark:bg-dark-danger/10">
            <Text className={`${tw.textPrimary} mb-3`}>{errorMessage}</Text>
            <Button label="Retry" variant="secondary" onPress={askAgain} />
          </Card>
        )}

        {result && (phase === 'success' || phase === 'awaiting_approval') && (
          <View className="gap-3">
            <Card>
              <Text className={`${tw.label} mb-1`}>You said</Text>
              <Text className={tw.textPrimary}>{result.userMessage.content}</Text>
            </Card>
            <Card>
              <Text className={`${tw.label} mb-1`}>Agent</Text>
              <Text className={tw.textPrimary}>{result.assistantMessage.content}</Text>
              {result.assistantMessage.toolCalls?.map((call, i) => (
                <View key={i} className="flex-row items-center gap-2 mt-2">
                  <Badge
                    label={call.status.replace('_', ' ')}
                    tone={
                      call.status === 'succeeded'
                        ? 'success'
                        : call.status === 'awaiting_approval'
                          ? 'warning'
                          : call.status === 'failed' || call.status === 'rejected'
                            ? 'danger'
                            : 'neutral'
                    }
                  />
                  <Text className={`${tw.textMuted} text-xs`}>{call.toolName}</Text>
                </View>
              ))}
            </Card>

            {phase === 'awaiting_approval' &&
              result.assistantMessage.toolCalls
                ?.filter((c) => c.status === 'awaiting_approval' && c.approvalId)
                .map((call) => (
                  <Card key={call.approvalId} className="bg-light-warning/10 dark:bg-dark-warning/10">
                    <Text className={`${tw.textPrimary} font-medium mb-1`}>Approval needed</Text>
                    <Text className={`${tw.textSecondary} text-sm mb-3`}>
                      The agent wants to run &quot;{call.toolName}&quot;. Review before it runs.
                    </Text>
                    <View className="flex-row gap-3">
                      <View className="flex-1">
                        <Button
                          label="Reject"
                          variant="secondary"
                          onPress={() => handleApprovalDecision(call.approvalId!, 'reject')}
                        />
                      </View>
                      <View className="flex-1">
                        <Button label="Approve" onPress={() => handleApprovalDecision(call.approvalId!, 'approve')} />
                      </View>
                    </View>
                  </Card>
                ))}

            <Button label="Ask something else" variant="ghost" onPress={askAgain} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
