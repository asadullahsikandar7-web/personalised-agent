import { View, Text, ScrollView, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { tw } from '../../../src/theme/tw';
import { Card, Badge, LoadingState, ErrorState } from '../../../src/components';
import { useCurrentUser } from '../../../src/hooks/useCurrentUser';
import { useTasks } from '../../../src/hooks/useTasks';
import { useReminders } from '../../../src/hooks/useReminders';
import { useConversations } from '../../../src/hooks/useConversations';
import { useMusicState } from '../../../src/hooks/useMusicState';
import { useActivity } from '../../../src/hooks/useActivity';
import { useQueryClient } from '@tanstack/react-query';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'Still up?';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

interface QuickAction {
  label: string;
  emoji: string;
  onPress: () => void;
}

export default function HomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();
  const [refreshing, setRefreshing] = useState(false);

  const tasksQuery = useTasks({ status: 'pending' });
  const remindersQuery = useReminders({ status: 'scheduled' });
  const conversationsQuery = useConversations(1, 3);
  const musicQuery = useMusicState();
  const activityQuery = useActivity(1, 3);

  const now = useMemo(
    () =>
      new Date().toLocaleString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
    [],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['tasks'] }),
      queryClient.invalidateQueries({ queryKey: ['reminders'] }),
      queryClient.invalidateQueries({ queryKey: ['conversations'] }),
      queryClient.invalidateQueries({ queryKey: ['music-state'] }),
      queryClient.invalidateQueries({ queryKey: ['activity'] }),
    ]);
    setRefreshing(false);
  }, [queryClient]);

  const quickActions: QuickAction[] = [
    { label: 'Ask Agent', emoji: '🎙️', onPress: () => router.push('/(app)/(tabs)/assistant') },
    { label: 'Add Reminder', emoji: '⏰', onPress: () => router.push('/(app)/reminders') },
    { label: 'Create Task', emoji: '✅', onPress: () => router.push('/(app)/(tabs)/tasks') },
    { label: 'Memories', emoji: '🧠', onPress: () => router.push('/(app)/memories') },
    { label: 'Music', emoji: '🎵', onPress: () => router.push('/(app)/music') },
    { label: 'Activity', emoji: '📜', onPress: () => router.push('/(app)/activity') },
  ];

  return (
    <SafeAreaView className={tw.screen} edges={['top']}>
      <ScrollView
        contentContainerClassName="px-5 pb-10"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C5CE7" />}
      >
        <View className="mt-3 mb-5">
          <Text className={tw.textSecondary}>{now}</Text>
          <Text className={tw.heading}>
            {greeting()}
            {user ? `, ${user.name.split(' ')[0]}` : ''}
          </Text>
        </View>

        <Pressable onPress={() => router.push('/(app)/(tabs)/assistant')} className="mb-5">
          <View className="bg-light-primary dark:bg-dark-primary rounded-2xl p-5 flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-white font-bold text-lg">Ask your agent anything</Text>
              <Text className="text-white/80 mt-1">Tap to speak or type a command</Text>
            </View>
            <Text className="text-4xl">🎙️</Text>
          </View>
        </Pressable>

        <Text className={`${tw.subheading} mb-3`}>Quick actions</Text>
        <View className="flex-row flex-wrap gap-3 mb-6">
          {quickActions.map((action) => (
            <Pressable key={action.label} onPress={action.onPress} className="w-[30%]">
              <Card className="items-center py-4">
                <Text className="text-2xl mb-1">{action.emoji}</Text>
                <Text className={`${tw.textPrimary} text-xs text-center font-medium`}>{action.label}</Text>
              </Card>
            </Pressable>
          ))}
        </View>

        <SectionHeader title="Upcoming reminders" onPress={() => router.push('/(app)/reminders')} />
        {remindersQuery.isLoading ? (
          <LoadingState label="Loading reminders…" />
        ) : remindersQuery.isError ? (
          <ErrorState onRetry={() => remindersQuery.refetch()} />
        ) : remindersQuery.data && remindersQuery.data.items.length > 0 ? (
          <View className="gap-2 mb-6">
            {remindersQuery.data.items.slice(0, 3).map((reminder) => (
              <Card key={reminder.id}>
                <Text className={`${tw.textPrimary} font-medium`}>{reminder.title}</Text>
                <Text className={`${tw.textMuted} text-xs mt-1`}>
                  {new Date(reminder.scheduledAt).toLocaleString()}
                </Text>
              </Card>
            ))}
          </View>
        ) : (
          <Card className="mb-6">
            <Text className={tw.textMuted}>No upcoming reminders. Ask your agent to set one.</Text>
          </Card>
        )}

        <SectionHeader title="Pending tasks" onPress={() => router.push('/(app)/(tabs)/tasks')} />
        {tasksQuery.isLoading ? (
          <LoadingState label="Loading tasks…" />
        ) : tasksQuery.isError ? (
          <ErrorState onRetry={() => tasksQuery.refetch()} />
        ) : tasksQuery.data && tasksQuery.data.items.length > 0 ? (
          <View className="gap-2 mb-6">
            {tasksQuery.data.items.slice(0, 3).map((task) => (
              <Card key={task.id} className="flex-row items-center justify-between">
                <Text className={`${tw.textPrimary} font-medium flex-1 pr-2`} numberOfLines={1}>
                  {task.title}
                </Text>
                <Badge
                  label={task.priority}
                  tone={task.priority === 'urgent' || task.priority === 'high' ? 'danger' : 'neutral'}
                />
              </Card>
            ))}
          </View>
        ) : (
          <Card className="mb-6">
            <Text className={tw.textMuted}>You&apos;re all caught up. No pending tasks.</Text>
          </Card>
        )}

        <SectionHeader title="Recent conversation" onPress={() => router.push('/(app)/(tabs)/conversations')} />
        {conversationsQuery.data && conversationsQuery.data.items.length > 0 ? (
          <Pressable onPress={() => router.push(`/(app)/conversations/${conversationsQuery.data.items[0]!.id}`)}>
            <Card className="mb-6">
              <Text className={`${tw.textPrimary} font-medium`}>{conversationsQuery.data.items[0]!.title}</Text>
              <Text className={`${tw.textMuted} text-xs mt-1`} numberOfLines={1}>
                {conversationsQuery.data.items[0]!.lastMessagePreview ?? 'No messages yet'}
              </Text>
            </Card>
          </Pressable>
        ) : (
          <Card className="mb-6">
            <Text className={tw.textMuted}>No conversations yet. Say hello to your agent.</Text>
          </Card>
        )}

        <SectionHeader title="Music" onPress={() => router.push('/(app)/music')} />
        <Card className="mb-6 flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className={`${tw.textPrimary} font-medium`}>
              {musicQuery.data?.currentTrack?.title ?? 'Nothing playing'}
            </Text>
            <Text className={`${tw.textMuted} text-xs mt-1`}>
              {musicQuery.data?.currentTrack?.artist ?? 'Play something from your library'}
            </Text>
          </View>
          <Badge label={musicQuery.data?.state ?? 'idle'} tone={musicQuery.data?.state === 'playing' ? 'success' : 'neutral'} />
        </Card>

        <SectionHeader title="Agent status" />
        <Card className="flex-row items-center gap-3">
          <View className="w-2.5 h-2.5 rounded-full bg-light-success dark:bg-dark-success" />
          <Text className={tw.textPrimary}>Online and ready</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ title, onPress }: { title: string; onPress?: () => void }) {
  return (
    <View className="flex-row items-center justify-between mb-3">
      <Text className={tw.subheading}>{title}</Text>
      {onPress ? (
        <Pressable onPress={onPress}>
          <Text className="text-light-primary dark:text-dark-primary text-sm font-medium">See all</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
