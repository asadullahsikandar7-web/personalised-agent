import { useState } from 'react';
import { View, Text, Pressable, TextInput, FlatList, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { tw } from '../../src/theme/tw';
import { Card, Badge, EmptyState, ErrorState, LoadingState, YoutubePlayer, JamendoAudioPlayer } from '../../src/components';
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
  const router = useRouter();
  const [query, setQuery] = useState('');
  const musicState = useMusicState();
  const play = useMusicPlay();
  const pause = useMusicPause();
  const next = useMusicNext();
  const previous = useMusicPrevious();
  const search = useMusicSearch(query);
  const playTrack = usePlayTrack();

  const isPlaying = musicState.data?.state === 'playing';
  const isYoutube = musicState.data?.provider === 'youtube';
  const isJamendo = musicState.data?.provider === 'jamendo';
  const currentTrack = musicState.data?.currentTrack;

  return (
    <SafeAreaView className={tw.screen} edges={['bottom']}>
      <View className="flex-1 px-5 pt-4">
        <Card className="items-center py-6 mb-5">
          {isJamendo && currentTrack?.streamUrl ? (
            <JamendoAudioPlayer streamUrl={currentTrack.streamUrl} isPlaying={isPlaying} onEnded={() => next.mutate()} />
          ) : null}
          {isYoutube && currentTrack ? (
            <View className="w-full mb-3">
              <YoutubePlayer videoId={currentTrack.id} isPlaying={isPlaying} onEnded={() => next.mutate()} />
            </View>
          ) : currentTrack?.artworkUrl ? (
            <View className="w-full mb-3" style={{ aspectRatio: 1, maxHeight: 200 }}>
              <Image source={{ uri: currentTrack.artworkUrl }} style={{ flex: 1, borderRadius: 12 }} resizeMode="cover" />
            </View>
          ) : (
            <Text className="text-5xl mb-3">🎵</Text>
          )}
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

        <View className="flex-row items-center justify-between mb-2">
          <Text className={tw.label}>{isJamendo ? 'Search Jamendo' : isYoutube ? 'Search YouTube' : 'Search catalog'}</Text>
          <Text
            className={`${tw.textMuted} text-xs underline`}
            onPress={() => router.push('/music-search')}
          >
            Search all catalogs
          </Text>
        </View>
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
            search.isError ? (
              <ErrorState message={search.error.message} onRetry={() => search.refetch()} />
            ) : query.trim() ? (
              <EmptyState title="No matches" description="Try a different search term." />
            ) : (
              <Text className={`${tw.textMuted} px-1`}>
                {isJamendo
                  ? 'Real full-track search and playback via Jamendo - independent, Creative Commons-licensed music.'
                  : isYoutube
                    ? 'Real YouTube search and playback via the official embedded player.'
                    : 'Playback uses a local mock catalog for development. Real third-party music-app control depends on platform APIs - see Settings → About for details.'}
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
