import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import type { RobotDTO } from '@personal-agent/shared';
import { tw } from '../../src/theme/tw';
import { Card, EmptyState, ErrorState, LoadingState } from '../../src/components';
import { useRobots, sendRobotRemoteCommand } from '../../src/hooks/useRobots';
import { useDriveController, type DriveDirection } from '../../src/features/robot/useDriveController';

const SPEEDS = [25, 40, 60, 80, 100];
const STEPS = [
  { label: 'Short', ms: 300 },
  { label: 'Normal', ms: 600 },
  { label: 'Long', ms: 1000 },
];
const LIVE_DISTANCE_INTERVAL_MS = 1500;

function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <View className="flex-row bg-light-surfaceAlt dark:bg-dark-surfaceAlt rounded-xl p-1">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            disabled={disabled}
            onPress={() => onChange(o.value)}
            className={`flex-1 items-center py-2 rounded-lg ${selected ? 'bg-light-primary dark:bg-dark-primary' : ''}`}
          >
            <Text className={selected ? 'text-white font-semibold text-sm' : `${tw.textSecondary} text-sm`}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function PadButton({
  direction,
  icon,
  active,
  disabled,
  onPressIn,
  onPressOut,
}: {
  direction: DriveDirection;
  icon: string;
  active: boolean;
  disabled: boolean;
  onPressIn: (d: DriveDirection) => void;
  onPressOut: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Drive ${direction}`}
      disabled={disabled}
      onPressIn={() => onPressIn(direction)}
      onPressOut={onPressOut}
      className={`w-24 h-24 rounded-3xl items-center justify-center ${
        active ? 'bg-light-primary dark:bg-dark-primary' : 'bg-light-primaryMuted dark:bg-dark-primaryMuted'
      } ${disabled ? 'opacity-30' : ''}`}
    >
      <Text className={`text-4xl ${active ? 'text-white' : 'text-light-primary dark:text-dark-primary'}`}>{icon}</Text>
    </Pressable>
  );
}

function distanceTone(cm: number | null) {
  if (cm === null) return { text: tw.textMuted, note: 'No reading yet' };
  if (cm < 20) return { text: 'text-light-danger dark:text-dark-danger', note: 'Obstacle very close!' };
  if (cm < 50) return { text: 'text-light-warning dark:text-dark-warning', note: 'Getting close' };
  return { text: 'text-light-success dark:text-dark-success', note: 'Path clear' };
}

export default function RemoteControlScreen() {
  const robotsQuery = useRobots(5000);
  const robots = robotsQuery.data ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [speed, setSpeed] = useState(40);
  const [stepMs, setStepMs] = useState(600);
  const [liveDistance, setLiveDistance] = useState(false);
  const [distanceCm, setDistanceCm] = useState<number | null>(null);
  const [measuring, setMeasuring] = useState(false);

  // Default to the first online robot (or the first one at all) until the user picks another.
  const robot: RobotDTO | undefined =
    robots.find((r) => r.id === selectedId) ?? robots.find((r) => r.status === 'online') ?? robots[0];
  const online = robot?.status === 'online';

  const send = useCallback(
    (command: Parameters<typeof sendRobotRemoteCommand>[1]) => sendRobotRemoteCommand(robot!.id, command),
    [robot?.id],
  );
  const drive = useDriveController(robot && online ? send : null, { speed, stepMs });

  const measure = useCallback(async () => {
    if (!robot || !online) return;
    setMeasuring(true);
    try {
      const res = await sendRobotRemoteCommand(robot.id, { command: 'get_distance' });
      const cm = (res.data as { distance_cm?: number } | null)?.distance_cm;
      if (typeof cm === 'number') setDistanceCm(cm);
    } catch {
      // A missed reading just leaves the last one on screen; live mode retries on its own.
    } finally {
      setMeasuring(false);
    }
  }, [robot?.id, online]);

  useEffect(() => {
    setDistanceCm(robot?.distanceCm ?? null);
  }, [robot?.id]);

  useEffect(() => {
    if (!liveDistance || !online) return;
    void measure();
    const timer = setInterval(() => void measure(), LIVE_DISTANCE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [liveDistance, online, measure]);

  const onPressIn = (direction: DriveDirection) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    void drive.press(direction);
  };
  const onStop = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    void drive.stop();
  };

  if (robotsQuery.isLoading) return <LoadingState label="Finding your robots…" />;
  if (robotsQuery.isError) return <ErrorState onRetry={() => robotsQuery.refetch()} />;
  if (!robot) {
    return (
      <View className={tw.screenPadded}>
        <EmptyState title="No robot yet" description="Register your robot first, then come back here to drive it." />
      </View>
    );
  }

  const tone = distanceTone(distanceCm);
  const padDisabled = !online;

  return (
    <SafeAreaView className={tw.screen} edges={['bottom']}>
      <ScrollView contentContainerClassName="px-5 py-4 gap-4">
        {robots.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
            {robots.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => setSelectedId(r.id)}
                className={`${tw.pill} py-2 ${r.id === robot.id ? 'bg-light-primary dark:bg-dark-primary' : ''}`}
              >
                <Text className={r.id === robot.id ? 'text-white text-xs font-semibold' : tw.pillText}>
                  {r.status === 'online' ? '🟢' : '⚪'} {r.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        <Card className="flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className={`${tw.textPrimary} font-semibold text-base`}>{robot.name}</Text>
            <Text className={online ? 'text-light-success dark:text-dark-success text-sm' : `${tw.textMuted} text-sm`}>
              {online ? '● Online - ready to drive' : '○ Offline - start the robot to drive it'}
            </Text>
          </View>
          <View className="items-end">
            <Text className={`${tone.text} text-2xl font-bold`}>{distanceCm === null ? '—' : `${Math.round(distanceCm)} cm`}</Text>
            <Text className={`${tw.textMuted} text-xs`}>{tone.note}</Text>
          </View>
        </Card>

        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Switch value={liveDistance} onValueChange={setLiveDistance} disabled={!online} />
            <Text className={tw.textSecondary}>Live distance</Text>
          </View>
          <Pressable onPress={measure} disabled={!online || measuring} className={`${tw.pill} py-2 ${!online || measuring ? 'opacity-40' : ''}`}>
            <Text className={tw.pillText}>{measuring ? 'Measuring…' : '📏 Measure now'}</Text>
          </Pressable>
        </View>

        <View className="items-center gap-3 my-2">
          <PadButton direction="forward" icon="▲" active={drive.active === 'forward'} disabled={padDisabled} onPressIn={onPressIn} onPressOut={drive.release} />
          <View className="flex-row gap-3 items-center">
            <PadButton direction="left" icon="◀" active={drive.active === 'left'} disabled={padDisabled} onPressIn={onPressIn} onPressOut={drive.release} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Stop"
              disabled={padDisabled}
              onPress={onStop}
              className={`w-24 h-24 rounded-full items-center justify-center bg-light-danger dark:bg-dark-danger ${padDisabled ? 'opacity-30' : ''}`}
            >
              <Text className="text-white font-bold text-lg">STOP</Text>
            </Pressable>
            <PadButton direction="right" icon="▶" active={drive.active === 'right'} disabled={padDisabled} onPressIn={onPressIn} onPressOut={drive.release} />
          </View>
          <PadButton direction="backward" icon="▼" active={drive.active === 'backward'} disabled={padDisabled} onPressIn={onPressIn} onPressOut={drive.release} />
          <Text className={`${tw.textMuted} text-xs text-center`}>Hold an arrow to drive, release to stop. Tap for a short nudge.</Text>
        </View>

        {drive.error ? (
          <Card className="bg-light-danger/10 dark:bg-dark-danger/10">
            <Text className={`${tw.textPrimary} text-sm`}>⚠️ {drive.error}</Text>
          </Card>
        ) : drive.lastMessage ? (
          <Text className={`${tw.textSecondary} text-sm text-center`}>{drive.lastMessage}</Text>
        ) : null}

        <View className="gap-2">
          <Text className={tw.label}>Speed (forward / backward)</Text>
          <Segmented options={SPEEDS.map((s) => ({ label: `${s}%`, value: s }))} value={speed} onChange={setSpeed} />
        </View>
        <View className="gap-2">
          <Text className={tw.label}>Step length</Text>
          <Segmented options={STEPS.map((s) => ({ label: s.label, value: s.ms }))} value={stepMs} onChange={setStepMs} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
