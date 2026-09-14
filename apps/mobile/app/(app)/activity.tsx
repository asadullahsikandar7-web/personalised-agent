import { View, Text, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tw } from '../../src/theme/tw';
import { Card, Badge, EmptyState, ErrorState, LoadingState } from '../../src/components';
import { useActivity } from '../../src/hooks/useActivity';
import type { ActivityLogDTO } from '@personal-agent/shared';

function categoryTone(category: ActivityLogDTO['category']): 'success' | 'warning' | 'danger' | 'neutral' {
  if (category === 'agent') return 'success';
  if (category === 'tool') return 'neutral';
  if (category === 'auth') return 'warning';
  return 'neutral';
}

export default function ActivityScreen() {
  const activityQuery = useActivity(1, 50);

  return (
    <SafeAreaView className={tw.screen} edges={['bottom']}>
      <View className="flex-1 px-5 pt-4">
        {activityQuery.isLoading ? (
          <LoadingState label="Loading activity…" />
        ) : activityQuery.isError ? (
          <ErrorState onRetry={() => activityQuery.refetch()} />
        ) : (
          <FlatList
            data={activityQuery.data?.items ?? []}
            keyExtractor={(item) => item.id}
            contentContainerClassName="pb-10"
            ListEmptyComponent={<EmptyState title="No activity yet" description="Actions the agent takes will show up here." />}
            renderItem={({ item }) => (
              <Card className="mb-2">
                <View className="flex-row items-start justify-between">
                  <Text className={`${tw.textPrimary} flex-1 pr-3`}>{item.description}</Text>
                  <Badge label={item.category} tone={categoryTone(item.category)} />
                </View>
                <Text className={`${tw.textMuted} text-xs mt-1.5`}>{new Date(item.createdAt).toLocaleString()}</Text>
              </Card>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
