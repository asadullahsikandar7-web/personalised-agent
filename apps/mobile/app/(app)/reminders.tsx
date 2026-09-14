import { useState } from 'react';
import { View, Text, FlatList, Pressable, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tw } from '../../src/theme/tw';
import { Card, Badge, Button, EmptyState, ErrorState, LoadingState, TextField } from '../../src/components';
import {
  useReminders,
  useCreateReminder,
  useCancelReminder,
  useSnoozeReminder,
  useCompleteReminder,
} from '../../src/hooks/useReminders';
import type { ReminderDTO } from '@personal-agent/shared';

function statusTone(status: ReminderDTO['status']): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'triggered' || status === 'completed') return 'success';
  if (status === 'snoozed') return 'warning';
  if (status === 'cancelled' || status === 'missed') return 'danger';
  return 'neutral';
}

export default function RemindersScreen() {
  const remindersQuery = useReminders();
  const createReminder = useCreateReminder();
  const cancelReminder = useCancelReminder();
  const snoozeReminder = useSnoozeReminder();
  const completeReminder = useCompleteReminder();

  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [minutesFromNow, setMinutesFromNow] = useState('60');

  const submit = async () => {
    const minutes = Number(minutesFromNow) || 60;
    await createReminder.mutateAsync({
      title,
      scheduledAt: new Date(Date.now() + minutes * 60_000).toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      notificationChannel: 'local',
    });
    setTitle('');
    setMinutesFromNow('60');
    setModalVisible(false);
  };

  return (
    <SafeAreaView className={tw.screen} edges={['bottom']}>
      <View className="flex-1 px-5 pt-4">
        <View className="flex-row items-center justify-between mb-4">
          <Text className={tw.textSecondary}>Upcoming and past reminders</Text>
          <Pressable onPress={() => setModalVisible(true)} className="w-10 h-10 rounded-full bg-light-primary dark:bg-dark-primary items-center justify-center">
            <Text className="text-white text-xl leading-none">+</Text>
          </Pressable>
        </View>

        {remindersQuery.isLoading ? (
          <LoadingState label="Loading reminders…" />
        ) : remindersQuery.isError ? (
          <ErrorState onRetry={() => remindersQuery.refetch()} />
        ) : (
          <FlatList
            data={remindersQuery.data?.items ?? []}
            keyExtractor={(item) => item.id}
            contentContainerClassName="pb-10"
            ListEmptyComponent={
              <EmptyState title="No reminders yet" description="Create one, or ask your agent to set one for you." />
            }
            renderItem={({ item }) => (
              <Card className="mb-2">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <Text className={`${tw.textPrimary} font-medium`}>{item.title}</Text>
                    <Text className={`${tw.textMuted} text-xs mt-1`}>
                      {new Date(item.scheduledAt).toLocaleString()}
                      {item.recurrenceRule && item.recurrenceRule.type !== 'none' ? ` · repeats ${item.recurrenceRule.type}` : ''}
                    </Text>
                  </View>
                  <Badge label={item.status} tone={statusTone(item.status)} />
                </View>
                {item.status === 'scheduled' && (
                  <View className="flex-row gap-2 mt-3">
                    <Pressable
                      onPress={() => snoozeReminder.mutate({ id: item.id, minutes: 10 })}
                      className={`${tw.buttonSecondary} flex-1 py-2`}
                    >
                      <Text className={`${tw.buttonSecondaryText} text-sm`}>Snooze 10m</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => completeReminder.mutate(item.id)}
                      className="flex-1 py-2 rounded-xl items-center justify-center bg-light-success/15 dark:bg-dark-success/15"
                    >
                      <Text className={`${tw.badgeSuccessText} text-sm`}>Complete</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => cancelReminder.mutate(item.id)}
                      className="flex-1 py-2 rounded-xl items-center justify-center bg-light-danger/10 dark:bg-dark-danger/10"
                    >
                      <Text className={`${tw.badgeDangerText} text-sm`}>Cancel</Text>
                    </Pressable>
                  </View>
                )}
              </Card>
            )}
          />
        )}
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className={`${tw.card} rounded-b-none rounded-t-3xl`}>
            <Text className={`${tw.subheading} mb-4`}>New reminder</Text>
            <TextField label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Study Data Structures" />
            <TextField
              label="Minutes from now"
              value={minutesFromNow}
              onChangeText={setMinutesFromNow}
              keyboardType="number-pad"
            />
            <View className="flex-row gap-3 mt-2">
              <View className="flex-1">
                <Button label="Cancel" variant="ghost" onPress={() => setModalVisible(false)} />
              </View>
              <View className="flex-1">
                <Button label="Create" onPress={submit} loading={createReminder.isPending} disabled={!title.trim()} />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
