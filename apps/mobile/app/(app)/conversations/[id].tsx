import { useState } from 'react';
import { View, Text, FlatList, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import type { MessageDTO } from '@personal-agent/shared';
import { tw } from '../../../src/theme/tw';
import { Badge, ErrorState, LoadingState } from '../../../src/components';
import { useConversationMessages } from '../../../src/hooks/useConversation';
import { useSendAgentMessage } from '../../../src/hooks/useSendAgentMessage';

function MessageBubble({ message }: { message: MessageDTO }) {
  const isUser = message.role === 'user';
  return (
    <View className={`max-w-[85%] mb-3 ${isUser ? 'self-end items-end' : 'self-start items-start'}`}>
      <View
        className={`rounded-2xl px-4 py-3 ${
          isUser ? 'bg-light-primary dark:bg-dark-primary' : tw.card
        }`}
      >
        <Text className={isUser ? 'text-white' : tw.textPrimary}>{message.content}</Text>
      </View>
      {message.toolCalls?.map((call, i) => (
        <View key={i} className="flex-row items-center gap-1.5 mt-1">
          <Badge
            label={call.toolName}
            tone={call.status === 'succeeded' ? 'success' : call.status === 'failed' ? 'danger' : 'neutral'}
          />
        </View>
      ))}
    </View>
  );
}

export default function ConversationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [draft, setDraft] = useState('');
  const messagesQuery = useConversationMessages(id, 1, 100);
  const sendMessage = useSendAgentMessage();

  const onSend = async () => {
    if (!draft.trim()) return;
    const text = draft;
    setDraft('');
    await sendMessage.mutateAsync({ message: text, conversationId: id, source: 'text' });
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
            data={messagesQuery.data?.items ?? []}
            keyExtractor={(item) => item.id}
            contentContainerClassName="px-5 py-4"
            renderItem={({ item }) => <MessageBubble message={item} />}
          />
        )}

        <View className="flex-row items-center gap-2 px-5 py-3 border-t border-light-border dark:border-dark-border">
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Message your agent…"
            placeholderTextColor="#8B8D98"
            className={`${tw.input} flex-1`}
            onSubmitEditing={onSend}
          />
          <Pressable
            onPress={onSend}
            disabled={!draft.trim() || sendMessage.isPending}
            className={`${tw.buttonPrimary} px-4 ${!draft.trim() ? 'opacity-40' : ''}`}
          >
            <Text className={tw.buttonPrimaryText}>Send</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
