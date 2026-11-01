import { useState } from 'react';
import { View, Text, TextInput, FlatList, Image, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tw } from '../../src/theme/tw';
import { Card, Badge, EmptyState, ErrorState, LoadingState } from '../../src/components';
import { useMusicCatalogSearch } from '../../src/hooks/useMusicCatalogSearch';
import type { NormalizedTrackDTO } from '@personal-agent/shared';

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function providerTone(provider: string): 'danger' | 'neutral' {
  return provider === 'youtube' ? 'danger' : 'neutral';
}

export default function MusicCatalogSearchScreen() {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [genre, setGenre] = useState('');

  const search = useMusicCatalogSearch({ title, artist, album, genre, provider: 'all' });
  const hasQuery = Boolean(title.trim() || artist.trim() || album.trim() || genre.trim());

  return (
    <SafeAreaView className={tw.screen} edges={['bottom']}>
      <View className="flex-1 px-5 pt-4">
        <Text className={`${tw.textMuted} text-xs mb-3`}>
          Search-only lookup across configured catalogs (YouTube, Jamendo). Metadata only - title,
          artist, album, artwork, duration, and a source link. Does not play anything.
        </Text>

        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Song title"
          placeholderTextColor="#8B8D98"
          className={`${tw.input} mb-2`}
        />
        <TextInput
          value={artist}
          onChangeText={setArtist}
          placeholder="Artist"
          placeholderTextColor="#8B8D98"
          className={`${tw.input} mb-2`}
        />
        <TextInput
          value={album}
          onChangeText={setAlbum}
          placeholder="Album"
          placeholderTextColor="#8B8D98"
          className={`${tw.input} mb-2`}
        />
        <TextInput
          value={genre}
          onChangeText={setGenre}
          placeholder="Genre"
          placeholderTextColor="#8B8D98"
          className={`${tw.input} mb-3`}
        />

        {search.isLoading && hasQuery ? <LoadingState label="Searching…" /> : null}

        {search.isError ? <ErrorState message={search.error.message} onRetry={() => search.refetch()} /> : null}

        {search.data ? (
          <>
            {search.data.providersFailed.length > 0 ? (
              <Card className="mb-3">
                <Text className={`${tw.textMuted} text-xs`}>
                  {search.data.providersFailed.map((f) => `${f.provider}: ${f.message}`).join('  •  ')}
                </Text>
              </Card>
            ) : null}

            <FlatList
              data={search.data.results}
              keyExtractor={(item) => `${item.provider}:${item.providerTrackId}`}
              ListEmptyComponent={<EmptyState title="No matches" description="Try different search terms." />}
              renderItem={({ item }: { item: NormalizedTrackDTO }) => (
                <Card className="mb-2 flex-row items-center">
                  {item.artwork ? (
                    <Image source={{ uri: item.artwork }} style={{ width: 48, height: 48, borderRadius: 8, marginRight: 12 }} />
                  ) : (
                    <View
                      style={{ width: 48, height: 48, borderRadius: 8, marginRight: 12 }}
                      className="items-center justify-center bg-light-surfaceAlt dark:bg-dark-surfaceAlt"
                    >
                      <Text>🎵</Text>
                    </View>
                  )}
                  <View className="flex-1">
                    <Text className={`${tw.textPrimary} font-medium`} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text className={`${tw.textMuted} text-xs mt-0.5`} numberOfLines={1}>
                      {item.artist}
                      {item.album ? ` • ${item.album}` : ''}
                      {item.durationSeconds !== null ? ` • ${formatDuration(item.durationSeconds)}` : ''}
                    </Text>
                  </View>
                  <View className="items-end gap-1 ml-2">
                    <Badge label={item.provider} tone={providerTone(item.provider)} />
                    <Text
                      className={`${tw.textMuted} text-xs underline`}
                      onPress={() => Linking.openURL(item.sourceUrl)}
                    >
                      Open
                    </Text>
                  </View>
                </Card>
              )}
            />
          </>
        ) : !search.isLoading && !search.isError ? (
          <EmptyState
            title="Search the catalog"
            description="Enter a title, artist, album, or genre above to search YouTube and Jamendo."
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}
