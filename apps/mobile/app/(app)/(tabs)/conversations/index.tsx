import { useState } from 'react';
import { View, Text, FlatList, TextInput, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { tw } from '../../../../src/theme/tw';
import { Card, EmptyState, ErrorState, LoadingState } from '../../../../src/components';
import { useConversations } from '../../../../src/hooks/useConversations';
import { useSendAgentMessage } from '../../../../src/hooks/useSendAgentMessage';

export default function ConversationsScreen() {
  const router = useRouter();
  const [draft, setDraft] = useState('');
  const conversationsQuery = useConversations(1, 50);
  const sendMessage = useSendAgentMessage();

  const startNewConversation = async () => {
    if (!draft.trim()) return;
    const text = draft;
    setDraft('');
    const data = await sendMessage.mutateAsync({ message: text, source: 'text' });
    router.push(`/(app)/conversations/${data.conversationId}`);
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
          onSubmitEditing={startNewConversation}
        />
        <Pressable
          onPress={startNewConversation}
          disabled={!draft.trim() || sendMessage.isPending}
          className={`${tw.buttonPrimary} px-4 ${!draft.trim() ? 'opacity-40' : ''}`}
        >
          <Text className={tw.buttonPrimaryText}>Send</Text>
        </Pressable>
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
