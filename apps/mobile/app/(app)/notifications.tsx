import { View, Text, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tw } from '../../src/theme/tw';
import { Card, EmptyState, ErrorState, LoadingState } from '../../src/components';
import { useNotifications, useMarkNotificationRead } from '../../src/hooks/useNotifications';

export default function NotificationsScreen() {
  const notificationsQuery = useNotifications();
  const markRead = useMarkNotificationRead();

  return (
    <SafeAreaView className={tw.screen} edges={['bottom']}>
      <View className="flex-1 px-5 pt-4">
        {notificationsQuery.isLoading ? (
          <LoadingState label="Loading notifications…" />
        ) : notificationsQuery.isError ? (
          <ErrorState onRetry={() => notificationsQuery.refetch()} />
        ) : (
          <FlatList
            data={notificationsQuery.data?.items ?? []}
            keyExtractor={(item) => item.id}
            contentContainerClassName="pb-10"
            ListEmptyComponent={<EmptyState title="No notifications" description="Reminders and approval requests will appear here." />}
            renderItem={({ item }) => (
              <Pressable onPress={() => !item.isRead && markRead.mutate(item.id)}>
                <Card className={`mb-2 ${item.isRead ? 'opacity-60' : ''}`}>
                  <View className="flex-row items-center gap-2">
                    {!item.isRead && <View className="w-2 h-2 rounded-full bg-light-primary dark:bg-dark-primary" />}
                    <Text className={`${tw.textPrimary} font-medium flex-1`}>{item.title}</Text>
                  </View>
                  <Text className={`${tw.textSecondary} text-sm mt-1`}>{item.body}</Text>
                  <Text className={`${tw.textMuted} text-xs mt-1.5`}>{new Date(item.createdAt).toLocaleString()}</Text>
                </Card>
              </Pressable>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
