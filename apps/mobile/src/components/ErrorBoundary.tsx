import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Button } from './Button';
import { tw } from '../theme/tw';

interface Props {
  error: Error;
  retry: () => void;
}

/**
 * Expo Router renders this automatically (via the named `ErrorBoundary` export in a layout file)
 * whenever a screen throws during render, instead of a blank white screen or a native crash.
 */
export function ErrorBoundary({ error, retry }: Props) {
  return (
    <View className={`${tw.screen} items-center justify-center px-6`}>
      <Text className={`${tw.heading} text-center`}>Something went wrong</Text>
      <ScrollView className="max-h-40 my-4" bounces={false}>
        <Text className={`${tw.textMuted} text-center`}>{error.message}</Text>
      </ScrollView>
      <Button label="Try again" onPress={retry} />
    </View>
  );
}
