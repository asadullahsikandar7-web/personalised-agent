import { useState } from 'react';
import { View, Text, FlatList, Pressable, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { TaskDTO, TaskPriority } from '@personal-agent/shared';
import { TASK_PRIORITIES } from '@personal-agent/shared';
import { tw } from '../../../src/theme/tw';
import { Card, Badge, Button, EmptyState, ErrorState, LoadingState, TextField } from '../../../src/components';
import { useTasks, useCreateTask, useCompleteTask, useDeleteTask } from '../../../src/hooks/useTasks';

const STATUS_FILTERS = [
  { label: 'Pending', value: 'pending' },
  { label: 'In progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'All', value: undefined },
] as const;

function priorityTone(priority: TaskPriority): 'danger' | 'warning' | 'neutral' {
  if (priority === 'urgent' || priority === 'high') return 'danger';
  if (priority === 'medium') return 'warning';
  return 'neutral';
}

export default function TasksScreen() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>('pending');
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');

  const tasksQuery = useTasks({ status: statusFilter });
  const createTask = useCreateTask();
  const completeTask = useCompleteTask();
  const deleteTask = useDeleteTask();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const submitTask = async () => {
    if (!title.trim()) return;
    await createTask.mutateAsync({ title, priority, tags: [] });
    setTitle('');
    setPriority('medium');
    setModalVisible(false);
  };

  const renderTask = ({ item }: { item: TaskDTO }) => (
    <Card className="mb-2">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text className={`${tw.textPrimary} font-medium`}>{item.title}</Text>
          {item.dueDate ? (
            <Text className={`${tw.textMuted} text-xs mt-1`}>Due {new Date(item.dueDate).toLocaleDateString()}</Text>
          ) : null}
        </View>
        <Badge label={item.priority} tone={priorityTone(item.priority)} />
      </View>
      <View className="flex-row gap-2 mt-3">
        {item.status !== 'completed' && (
          <Pressable onPress={() => completeTask.mutate(item.id)} className={`${tw.buttonSecondary} flex-1 py-2`}>
            <Text className={`${tw.buttonSecondaryText} text-sm`}>Complete</Text>
          </Pressable>
        )}
        <Pressable
          onPress={() => setConfirmDeleteId(item.id)}
          className="flex-1 py-2 rounded-xl items-center justify-center bg-light-danger/10 dark:bg-dark-danger/10"
        >
          <Text className={`${tw.badgeDangerText} text-sm`}>Delete</Text>
        </Pressable>
      </View>
    </Card>
  );

  return (
    <SafeAreaView className={tw.screen} edges={['top']}>
      <View className="px-5 pt-3 pb-2 flex-row items-center justify-between">
        <View>
          <Text className={tw.heading}>Tasks</Text>
          <Text className={tw.textSecondary}>Keep track of what needs doing.</Text>
        </View>
        <Pressable onPress={() => setModalVisible(true)} className="w-11 h-11 rounded-full bg-light-primary dark:bg-dark-primary items-center justify-center">
          <Text className="text-white text-2xl leading-none">+</Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="px-5 gap-2 pb-3">
        {STATUS_FILTERS.map((f) => (
          <Pressable
            key={f.label}
            onPress={() => setStatusFilter(f.value)}
            className={statusFilter === f.value ? tw.pill : 'rounded-full px-3 py-1 bg-light-surfaceAlt dark:bg-dark-surfaceAlt'}
          >
            <Text className={statusFilter === f.value ? tw.pillText : `${tw.textSecondary} text-xs font-semibold`}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {tasksQuery.isLoading ? (
        <LoadingState label="Loading tasks…" />
      ) : tasksQuery.isError ? (
        <ErrorState onRetry={() => tasksQuery.refetch()} />
      ) : (
        <FlatList
          data={tasksQuery.data?.items ?? []}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-5 pb-10"
          ListEmptyComponent={
            <EmptyState title="No tasks here" description="Create one with the + button or ask your agent." />
          }
          renderItem={renderTask}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className={`${tw.card} rounded-b-none rounded-t-3xl`}>
            <Text className={`${tw.subheading} mb-4`}>New task</Text>
            <TextField label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Finish project proposal" />
            <Text className={`${tw.label} mb-2`}>Priority</Text>
            <View className="flex-row gap-2 mb-5">
              {TASK_PRIORITIES.map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setPriority(p)}
                  className={priority === p ? tw.pill : 'rounded-full px-3 py-1 bg-light-surfaceAlt dark:bg-dark-surfaceAlt'}
                >
                  <Text className={priority === p ? tw.pillText : `${tw.textSecondary} text-xs font-semibold`}>{p}</Text>
                </Pressable>
              ))}
            </View>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button label="Cancel" variant="ghost" onPress={() => setModalVisible(false)} />
              </View>
              <View className="flex-1">
                <Button label="Create" onPress={submitTask} loading={createTask.isPending} disabled={!title.trim()} />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!confirmDeleteId} transparent animationType="fade" onRequestClose={() => setConfirmDeleteId(null)}>
        <View className="flex-1 items-center justify-center bg-black/40 px-8">
          <View className={`${tw.card} w-full`}>
            <Text className={`${tw.subheading} mb-2`}>Delete this task?</Text>
            <Text className={`${tw.textSecondary} mb-5`}>This can&apos;t be undone.</Text>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button label="Cancel" variant="ghost" onPress={() => setConfirmDeleteId(null)} />
              </View>
              <View className="flex-1">
                <Button
                  label="Delete"
                  variant="danger"
                  onPress={async () => {
                    if (confirmDeleteId) await deleteTask.mutateAsync(confirmDeleteId);
                    setConfirmDeleteId(null);
                  }}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
