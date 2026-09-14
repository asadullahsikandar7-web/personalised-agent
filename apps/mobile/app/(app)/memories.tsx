import { useState } from 'react';
import { View, Text, FlatList, Pressable, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MEMORY_CATEGORIES, type MemoryCategory } from '@personal-agent/shared';
import { tw } from '../../src/theme/tw';
import { Card, Badge, Button, EmptyState, ErrorState, LoadingState, TextField } from '../../src/components';
import { useMemories, useCreateMemory, useUpdateMemory, useDeleteMemory } from '../../src/hooks/useMemories';

export default function MemoriesScreen() {
  const [search, setSearch] = useState('');
  const memoriesQuery = useMemories({ search: search || undefined });
  const createMemory = useCreateMemory();
  const updateMemory = useUpdateMemory();
  const deleteMemory = useDeleteMemory();

  const [modalVisible, setModalVisible] = useState(false);
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [category, setCategory] = useState<MemoryCategory>('preference');
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const submit = async () => {
    setFormError(null);
    try {
      await createMemory.mutateAsync({ key, value, category, isPinned: false });
      setKey('');
      setValue('');
      setModalVisible(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save this memory.');
    }
  };

  return (
    <SafeAreaView className={tw.screen} edges={['bottom']}>
      <View className="flex-1 px-5 pt-4">
        <View className="flex-row items-center gap-2 mb-4">
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search memories…"
            placeholderTextColor="#8B8D98"
            className={`${tw.input} flex-1`}
          />
          <Pressable onPress={() => setModalVisible(true)} className="w-11 h-11 rounded-full bg-light-primary dark:bg-dark-primary items-center justify-center">
            <Text className="text-white text-2xl leading-none">+</Text>
          </Pressable>
        </View>

        {memoriesQuery.isLoading ? (
          <LoadingState label="Loading memories…" />
        ) : memoriesQuery.isError ? (
          <ErrorState onRetry={() => memoriesQuery.refetch()} />
        ) : (
          <FlatList
            data={memoriesQuery.data?.items ?? []}
            keyExtractor={(item) => item.id}
            contentContainerClassName="pb-10"
            ListEmptyComponent={
              <EmptyState title="No memories saved" description="Tell your agent to remember something, or add one manually." />
            }
            renderItem={({ item }) => (
              <Card className="mb-2">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <Text className={`${tw.textPrimary} font-medium`}>{item.key}</Text>
                    <Text className={`${tw.textSecondary} text-sm mt-1`}>{item.value}</Text>
                  </View>
                  <Badge label={item.category.replace('_', ' ')} />
                </View>
                <View className="flex-row gap-2 mt-3">
                  <Pressable
                    onPress={() => updateMemory.mutate({ id: item.id, input: { isPinned: !item.isPinned } })}
                    className={`${tw.buttonSecondary} flex-1 py-2`}
                  >
                    <Text className={`${tw.buttonSecondaryText} text-sm`}>{item.isPinned ? 'Unpin' : 'Pin'}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setConfirmDeleteId(item.id)}
                    className="flex-1 py-2 rounded-xl items-center justify-center bg-light-danger/10 dark:bg-dark-danger/10"
                  >
                    <Text className={`${tw.badgeDangerText} text-sm`}>Delete</Text>
                  </Pressable>
                </View>
              </Card>
            )}
          />
        )}
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className={`${tw.card} rounded-b-none rounded-t-3xl`}>
            <Text className={`${tw.subheading} mb-4`}>Remember something</Text>
            <TextField label="Key" value={key} onChangeText={setKey} placeholder="e.g. Preferred language" />
            <TextField label="Value" value={value} onChangeText={setValue} placeholder="e.g. TypeScript" multiline />
            <Text className={`${tw.label} mb-2`}>Category</Text>
            <View className="flex-row flex-wrap gap-2 mb-2">
              {MEMORY_CATEGORIES.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setCategory(c)}
                  className={category === c ? tw.pill : 'rounded-full px-3 py-1 bg-light-surfaceAlt dark:bg-dark-surfaceAlt'}
                >
                  <Text className={category === c ? tw.pillText : `${tw.textSecondary} text-xs font-semibold`}>
                    {c.replace('_', ' ')}
                  </Text>
                </Pressable>
              ))}
            </View>
            {formError ? <Text className={`${tw.errorText} mb-2`}>{formError}</Text> : null}
            <View className="flex-row gap-3 mt-3">
              <View className="flex-1">
                <Button label="Cancel" variant="ghost" onPress={() => setModalVisible(false)} />
              </View>
              <View className="flex-1">
                <Button label="Save" onPress={submit} loading={createMemory.isPending} disabled={!key.trim() || !value.trim()} />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!confirmDeleteId} transparent animationType="fade" onRequestClose={() => setConfirmDeleteId(null)}>
        <View className="flex-1 items-center justify-center bg-black/40 px-8">
          <View className={`${tw.card} w-full`}>
            <Text className={`${tw.subheading} mb-2`}>Forget this memory?</Text>
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
                    if (confirmDeleteId) await deleteMemory.mutateAsync(confirmDeleteId);
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
