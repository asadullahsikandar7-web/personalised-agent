import { useCallback, useEffect, useRef, useState } from 'react';
import type { RobotRemoteCommandInput, RobotRemoteCommandResultDTO } from '@personal-agent/shared';

export type DriveDirection = 'forward' | 'backward' | 'left' | 'right';

export interface DriveSettings {
  /** Motor speed for forward/backward, 0-100%. Turns run at the robot's own turn speed. */
  speed: number;
  /** Length of one motion pulse. Holding a button repeats pulses; a tap sends exactly one. */
  stepMs: number;
}

type Send = (command: RobotRemoteCommandInput) => Promise<RobotRemoteCommandResultDTO>;

function commandFor(direction: DriveDirection, { speed, stepMs }: DriveSettings): RobotRemoteCommandInput {
  return direction === 'left' || direction === 'right'
    ? { command: 'turn', direction, durationMs: stepMs }
    : { command: 'move', direction, speed, durationMs: stepMs };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Hold-to-drive for the remote-control pad.
 *
 * While a direction is held it sends one short motion pulse, waits for the robot to answer, and
 * sends the next - never more than one in flight, so a slow link can't queue up a backlog of
 * moves that keep running after the finger lifts. Each pulse is short (stepMs), so if the app or
 * network dies mid-drive the robot stops on its own within one step. Releasing a held button
 * sends an explicit stop; a quick tap is left to finish its single pulse.
 */
export function useDriveController(send: Send | null, settings: DriveSettings) {
  const [active, setActive] = useState<DriveDirection | null>(null);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const heldRef = useRef<DriveDirection | null>(null);
  const pressedAtRef = useRef(0);
  const loopingRef = useRef(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const sendRef = useRef(send);
  sendRef.current = send;

  const report = useCallback((err: unknown) => {
    setError(err instanceof Error ? err.message : 'The robot did not respond.');
  }, []);

  const stop = useCallback(async () => {
    heldRef.current = null;
    setActive(null);
    if (!sendRef.current) return;
    try {
      const res = await sendRef.current({ command: 'stop' });
      setLastMessage(res.message ?? 'Stopped.');
      setError(null);
    } catch (err) {
      report(err);
    }
  }, [report]);

  const press = useCallback(
    async (direction: DriveDirection) => {
      if (!sendRef.current) return;
      heldRef.current = direction;
      pressedAtRef.current = Date.now();
      setActive(direction);
      setError(null);
      if (loopingRef.current) return; // the running loop picks up the new direction
      loopingRef.current = true;
      try {
        while (heldRef.current && sendRef.current) {
          const current = settingsRef.current;
          const startedAt = Date.now();
          const res = await sendRef.current(commandFor(heldRef.current, current));
          setLastMessage(res.message);
          // A robot that answers before the motion finishes must not be flooded with pulses.
          const minGap = current.stepMs * 0.8 - (Date.now() - startedAt);
          if (heldRef.current && minGap > 0) await sleep(minGap);
        }
      } catch (err) {
        heldRef.current = null;
        report(err);
      } finally {
        loopingRef.current = false;
        setActive(null);
      }
    },
    [report],
  );

  const release = useCallback(() => {
    if (!heldRef.current) return;
    const heldFor = Date.now() - pressedAtRef.current;
    heldRef.current = null;
    setActive(null);
    // A tap sends a single pulse that ends by itself; only a real hold needs an explicit stop.
    if (heldFor >= settingsRef.current.stepMs) void stop();
  }, [stop]);

  // Leaving the screen mid-drive must not leave the robot driving.
  useEffect(
    () => () => {
      if (heldRef.current && sendRef.current) void sendRef.current({ command: 'stop' }).catch(() => undefined);
      heldRef.current = null;
    },
    [],
  );

  return { active, lastMessage, error, press, release, stop, clearError: () => setError(null) };
}
