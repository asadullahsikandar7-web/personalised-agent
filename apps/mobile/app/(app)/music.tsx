import { useState } from 'react';
import { View, Text, Pressable, TextInput, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tw } from '../../src/theme/tw';
import { Card, Badge, EmptyState, LoadingState } from '../../src/components';
import {
  useMusicState,
  useMusicPlay,
  useMusicPause,
  useMusicNext,
  useMusicPrevious,
  useMusicSearch,
  usePlayTrack,
} from '../../src/hooks/useMusicState';

export default function MusicScreen() {
  const [query, setQuery] = useState('');
  const musicState = useMusicState();
  const play = useMusicPlay();
  const pause = useMusicPause();
  const next = useMusicNext();
  const previous = useMusicPrevious();
  const search = useMusicSearch(query);
  const playTrack = usePlayTrack();

  const isPlaying = musicState.data?.state === 'playing';

  return (
    <SafeAreaView className={tw.screen} edges={['bottom']}>
      <View className="flex-1 px-5 pt-4">
        <Card className="items-center py-6 mb-5">
          <Text className="text-5xl mb-3">🎵</Text>
          {musicState.isLoading ? (
            <LoadingState label="Loading playback…" />
          ) : (
            <>
              <Text className={`${tw.subheading} text-center`}>
                {musicState.data?.currentTrack?.title ?? 'Nothing playing'}
              </Text>
              <Text className={`${tw.textMuted} mt-1`}>{musicState.data?.currentTrack?.artist ?? '—'}</Text>
              <Badge label={musicState.data?.state ?? 'idle'} tone={isPlaying ? 'success' : 'neutral'} />

              <View className="flex-row items-center gap-6 mt-6">
                <Pressable onPress={() => previous.mutate()} className="w-12 h-12 items-center justify-center">
                  <Text className="text-3xl">⏮️</Text>
                </Pressable>
                <Pressable
                  onPress={() => (isPlaying ? pause.mutate() : play.mutate())}
                  className="w-16 h-16 rounded-full bg-light-primary dark:bg-dark-primary items-center justify-center"
                >
                  <Text className="text-3xl">{isPlaying ? '⏸️' : '▶️'}</Text>
                </Pressable>
                <Pressable onPress={() => next.mutate()} className="w-12 h-12 items-center justify-center">
                  <Text className="text-3xl">⏭️</Text>
                </Pressable>
              </View>
            </>
          )}
        </Card>

        <Text className={`${tw.label} mb-2`}>Search catalog</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by title, artist, or album…"
          placeholderTextColor="#8B8D98"
          className={`${tw.input} mb-3`}
        />

        <FlatList
          data={search.data ?? []}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            query.trim() ? (
              <EmptyState title="No matches" description="Try a different search term." />
            ) : (
              <Text className={`${tw.textMuted} px-1`}>
                Playback uses a local mock catalog for development. Real third-party music-app
                control depends on platform APIs - see Settings → About for details.
              </Text>
            )
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => playTrack.mutate(item.id)}>
              <Card className="mb-2 flex-row items-center justify-between">
                <View>
                  <Text className={`${tw.textPrimary} font-medium`}>{item.title}</Text>
                  <Text className={`${tw.textMuted} text-xs mt-0.5`}>{item.artist}</Text>
                </View>
                <Text className="text-xl">▶️</Text>
              </Card>
            </Pressable>
          )}
        />
      </View>
    </SafeAreaView>
  );
}
