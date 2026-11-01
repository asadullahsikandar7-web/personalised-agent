import { useRef, useState } from 'react';
import { View, Text, FlatList, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import type { ApprovalRequestDTO, MessageDTO, ToolCallDTO } from '@personal-agent/shared';
import { tw } from '../../../src/theme/tw';
import { Badge, ErrorState, LoadingState, QuickReplies } from '../../../src/components';
import { useConversationMessages } from '../../../src/hooks/useConversation';
import { useSendAgentMessage } from '../../../src/hooks/useSendAgentMessage';
import { useApprovals, useApproveRequest, useRejectRequest } from '../../../src/hooks/useApprovals';
import { ROBOT_QUICK_COMMANDS, friendlyToolName, parseRobotChoices } from '../../../src/features/robot/commands';

/** What happened to an approval decided from this screen - the stored message keeps saying "awaiting approval". */
type ApprovalOutcome = { decision: 'approved' | 'rejected'; message: string };

function ApprovalPrompt({
  call,
  summary,
  outcome,
  busy,
  onDecide,
}: {
  call: ToolCallDTO;
  summary?: string;
  outcome?: ApprovalOutcome;
  busy: boolean;
  onDecide: (decision: 'approve' | 'reject') => void;
}) {
  if (outcome) {
    return (
      <Text className={`${tw.textSecondary} text-xs mt-1`}>
        {outcome.decision === 'approved' ? '✅' : '🚫'} {outcome.message}
      </Text>
    );
  }
  return (
    <View className="mt-2 rounded-xl p-3 bg-light-warning/10 dark:bg-dark-warning/10">
      <Text className={`${tw.textPrimary} text-sm font-medium mb-2`}>{summary ?? `Run ${friendlyToolName(call.toolName)}?`}</Text>
      <View className="flex-row gap-2">
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => onDecide('reject')}
          className={`${tw.buttonSecondary} py-2 flex-1 ${busy ? 'opacity-40' : ''}`}
        >
          <Text className={tw.buttonSecondaryText}>Reject</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => onDecide('approve')}
          className={`${tw.buttonPrimary} py-2 flex-1 ${busy ? 'opacity-40' : ''}`}
        >
          <Text className={tw.buttonPrimaryText}>Approve</Text>
        </Pressable>
      </View>
    </View>
  );
}

function MessageBubble({
  message,
  pendingApprovals,
  outcomes,
  deciding,
  onDecide,
}: {
  message: MessageDTO;
  pendingApprovals: Map<string, ApprovalRequestDTO>;
  outcomes: Record<string, ApprovalOutcome>;
  deciding: string | null;
  onDecide: (approvalId: string, decision: 'approve' | 'reject') => void;
}) {
  const isUser = message.role === 'user';
  // "Which robot?" is a question, not a failure - don't paint its tool badge red.
  const asksForRobot = !isUser && parseRobotChoices(message.content).length > 0;
  return (
    <View className={`max-w-[85%] mb-3 ${isUser ? 'self-end items-end' : 'self-start items-start'}`}>
      <View className={`rounded-2xl px-4 py-3 ${isUser ? 'bg-light-primary dark:bg-dark-primary' : tw.card}`}>
        <Text className={isUser ? 'text-white' : tw.textPrimary}>{message.content}</Text>
      </View>
      <View className="flex-row flex-wrap gap-1.5 mt-1">
        {message.toolCalls?.map((call, i) => (
          <Badge
            key={i}
            label={friendlyToolName(call.toolName)}
            tone={
              asksForRobot
                ? 'neutral'
                : call.status === 'succeeded'
                ? 'success'
                : call.status === 'awaiting_approval'
                  ? 'warning'
                  : call.status === 'failed' || call.status === 'rejected'
                    ? 'danger'
                    : 'neutral'
            }
          />
        ))}
      </View>
      {message.toolCalls
        ?.filter((call) => call.status === 'awaiting_approval' && call.approvalId)
        .filter((call) => pendingApprovals.has(call.approvalId!) || outcomes[call.approvalId!])
        .map((call) => (
          <ApprovalPrompt
            key={call.approvalId}
            call={call}
            summary={pendingApprovals.get(call.approvalId!)?.summary}
            outcome={outcomes[call.approvalId!]}
            busy={deciding === call.approvalId}
            onDecide={(decision) => onDecide(call.approvalId!, decision)}
          />
        ))}
    </View>
  );
}

export default function ConversationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [draft, setDraft] = useState('');
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [outcomes, setOutcomes] = useState<Record<string, ApprovalOutcome>>({});
  const [deciding, setDeciding] = useState<string | null>(null);
  const listRef = useRef<FlatList<MessageDTO>>(null);

  const messagesQuery = useConversationMessages(id, 1, 100);
  const sendMessage = useSendAgentMessage();
  const pendingApprovalsQuery = useApprovals('pending');
  const approve = useApproveRequest();
  const reject = useRejectRequest();

  const messages = messagesQuery.data?.items ?? [];
  const pendingApprovals = new Map((pendingApprovalsQuery.data?.items ?? []).map((a) => [a.id, a]));
  const lastMessage = messages[messages.length - 1];
  const robotChoices = !pendingText && lastMessage?.role === 'assistant' ? parseRobotChoices(lastMessage.content) : [];
  const busy = sendMessage.isPending;

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    setSendError(null);
    setPendingText(text);
    try {
      await sendMessage.mutateAsync({ message: text, conversationId: id, source: 'text' });
      await messagesQuery.refetch();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Could not reach your agent. Please try again.');
      setDraft(text);
    } finally {
      setPendingText(null);
    }
  };

  const onSend = () => {
    const text = draft;
    setDraft('');
    void send(text);
  };

  const decide = async (approvalId: string, decision: 'approve' | 'reject') => {
    setDeciding(approvalId);
    try {
      if (decision === 'approve') {
        const res = await approve.mutateAsync(approvalId);
        const outcome = (res as { outcome?: { result?: { message?: string } } } | undefined)?.outcome;
        setOutcomes((o) => ({ ...o, [approvalId]: { decision: 'approved', message: outcome?.result?.message ?? 'Approved.' } }));
      } else {
        await reject.mutateAsync(approvalId);
        setOutcomes((o) => ({ ...o, [approvalId]: { decision: 'rejected', message: 'Rejected - nothing was run.' } }));
      }
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Could not process your decision.');
    } finally {
      setDeciding(null);
    }
  };

  return (
    <SafeAreaView className={tw.screen} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        {messagesQuery.isLoading ? (
          <LoadingState label="Loading conversation…" />
        ) : messagesQuery.isError ? (
          <ErrorState onRetry={() => messagesQuery.refetch()} />
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerClassName="px-5 py-4"
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <MessageBubble
                message={item}
                pendingApprovals={pendingApprovals}
                outcomes={outcomes}
                deciding={deciding}
                onDecide={decide}
              />
            )}
            ListFooterComponent={
              pendingText ? (
                <View>
                  <View className="max-w-[85%] mb-3 self-end rounded-2xl px-4 py-3 bg-light-primary dark:bg-dark-primary opacity-70">
                    <Text className="text-white">{pendingText}</Text>
                  </View>
                  <View className={`self-start flex-row items-center gap-2 rounded-2xl px-4 py-3 ${tw.card}`}>
                    <ActivityIndicator size="small" color="#6C5CE7" />
                    <Text className={tw.textMuted}>Agent is thinking…</Text>
                  </View>
                </View>
              ) : null
            }
          />
        )}

        {sendError && <Text className={`${tw.errorText} px-5`}>{sendError}</Text>}

        <View className="pt-2 border-t border-light-border dark:border-dark-border">
          {robotChoices.length > 0 ? (
            <QuickReplies
              items={robotChoices.map((c) => ({ key: c.name, label: `${c.number}. ${c.name} · ${c.status}` }))}
              onPick={(name) => void send(name)}
              disabled={busy}
            />
          ) : (
            <QuickReplies
              items={ROBOT_QUICK_COMMANDS.map((c) => ({ key: c.message, label: c.label }))}
              onPick={(message) => void send(message)}
              disabled={busy}
            />
          )}
          <View className="flex-row items-center gap-2 px-5 py-3">
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Message your agent… (try “robo status”)"
              placeholderTextColor="#8B8D98"
              className={`${tw.input} flex-1`}
              onSubmitEditing={onSend}
              returnKeyType="send"
            />
            <Pressable
              onPress={onSend}
              disabled={!draft.trim() || busy}
              className={`${tw.buttonPrimary} px-4 ${!draft.trim() || busy ? 'opacity-40' : ''}`}
            >
              <Text className={tw.buttonPrimaryText}>Send</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
