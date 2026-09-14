import { View, Text, FlatList } from 'react-native';
import { tw } from '../../src/theme/tw';
import { Card, Badge, ErrorState, LoadingState, EmptyState } from '../../src/components';
import { useTools } from '../../src/hooks/useTools';
import type { PermissionLevel } from '@personal-agent/shared';

function toneFor(level: PermissionLevel): 'success' | 'warning' | 'danger' | 'neutral' {
  if (level === 'safe') return 'success';
  if (level === 'normal') return 'neutral';
  if (level === 'approval_required') return 'warning';
  return 'danger';
}

export default function ToolsScreen() {
  const toolsQuery = useTools();

  return (
    <View className={tw.screen}>
      <View className="flex-1 px-5 pt-4">
        <Text className={`${tw.textSecondary} mb-4`}>
          Every capability your agent can use, and the permission level that gates it.
        </Text>
        {toolsQuery.isLoading ? (
          <LoadingState label="Loading tools…" />
        ) : toolsQuery.isError ? (
          <ErrorState onRetry={() => toolsQuery.refetch()} />
        ) : (
          <FlatList
            data={toolsQuery.data ?? []}
            keyExtractor={(item) => item.name}
            contentContainerClassName="pb-10"
            ListEmptyComponent={<EmptyState title="No tools registered" />}
            renderItem={({ item }) => (
              <Card className="mb-2">
                <View className="flex-row items-start justify-between">
                  <Text className={`${tw.textPrimary} font-medium flex-1 pr-3`}>{item.name.replace(/_/g, ' ')}</Text>
                  <Badge label={item.permissionLevel.replace('_', ' ')} tone={toneFor(item.permissionLevel)} />
                </View>
                <Text className={`${tw.textSecondary} text-sm mt-1.5`}>{item.description}</Text>
              </Card>
            )}
          />
        )}
      </View>
    </View>
  );
}
