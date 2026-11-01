import { useState } from 'react';
import { View, Text, FlatList, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { tw } from '../../../../src/theme/tw';
import { Card, EmptyState, ErrorState, LoadingState, QuickReplies } from '../../../../src/components';
import { ROBOT_QUICK_COMMANDS } from '../../../../src/features/robot/commands';
import { useConversations } from '../../../../src/hooks/useConversations';
import { useSendAgentMessage } from '../../../../src/hooks/useSendAgentMessage';

export default function ConversationsScreen() {
  const router = useRouter();
  const [draft, setDraft] = useState('');
  const conversationsQuery = useConversations(1, 50);
  const sendMessage = useSendAgentMessage();

  const [sendError, setSendError] = useState<string | null>(null);

  const startNewConversation = async (text: string) => {
    if (!text.trim() || sendMessage.isPending) return;
    setDraft('');
    setSendError(null);
    try {
      const data = await sendMessage.mutateAsync({ message: text, source: 'text' });
      router.push(`/(app)/conversations/${data.conversationId}`);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Could not reach your agent. Please try again.');
      setDraft(text);
    }
  };

  return (
    <SafeAreaView className={tw.screen} edges={['top']}>
      <View className="px-5 pt-3 pb-2">
        <Text className={tw.heading}>Chat</Text>
        <Text className={tw.textSecondary}>Text conversations with your agent.</Text>
      </View>

      <View className="px-5 mb-3 flex-row gap-2">
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Start a new conversation…"
          placeholderTextColor="#8B8D98"
          className={`${tw.input} flex-1`}
          onSubmitEditing={() => startNewConversation(draft)}
          returnKeyType="send"
        />
        <Pressable
          onPress={() => startNewConversation(draft)}
          disabled={!draft.trim() || sendMessage.isPending}
          className={`${tw.buttonPrimary} px-4 ${!draft.trim() || sendMessage.isPending ? 'opacity-40' : ''}`}
        >
          {sendMessage.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text className={tw.buttonPrimaryText}>Send</Text>}
        </Pressable>
      </View>
      {sendError && <Text className={`${tw.errorText} px-5 mb-2`}>{sendError}</Text>}

      <View className="px-5 mb-2 flex-row items-center justify-between">
        <Text className={tw.label}>Robot shortcuts</Text>
        <Pressable onPress={() => router.push('/(app)/remote')} className={`${tw.pill} py-1.5`}>
          <Text className={tw.pillText}>🎮 Remote control</Text>
        </Pressable>
      </View>
      <View className="mb-4">
        <QuickReplies
          items={ROBOT_QUICK_COMMANDS.map((c) => ({ key: c.message, label: c.label }))}
          onPick={(message) => void startNewConversation(message)}
          disabled={sendMessage.isPending}
        />
      </View>

      {conversationsQuery.isLoading ? (
        <LoadingState label="Loading conversations…" />
      ) : conversationsQuery.isError ? (
        <ErrorState onRetry={() => conversationsQuery.refetch()} />
      ) : (
        <FlatList
          data={conversationsQuery.data?.items ?? []}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-5 pb-10 gap-2"
          ListEmptyComponent={
            <EmptyState title="No conversations yet" description="Send a message above to start chatting with your agent." />
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/(app)/conversations/${item.id}`)}>
              <Card>
                <Text className={`${tw.textPrimary} font-medium`} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text className={`${tw.textMuted} text-xs mt-1`} numberOfLines={1}>
                  {item.lastMessagePreview ?? 'No messages yet'}
                </Text>
              </Card>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}
