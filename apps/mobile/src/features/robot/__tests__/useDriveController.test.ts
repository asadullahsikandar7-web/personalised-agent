import { renderHook, act } from '@testing-library/react-native';
import { useDriveController } from '../useDriveController';
import type { RobotRemoteCommandInput } from '@personal-agent/shared';

const settings = { speed: 60, stepMs: 100 };
const ok = (message = 'ok') => Promise.resolve({ message, data: null });

describe('useDriveController', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('sends a single pulse for a tap, without a stop', async () => {
    const send = jest.fn((_command: RobotRemoteCommandInput) => ok());
    const { result } = await renderHook(() => useDriveController(send, settings));
    await act(async () => {
      const pressing = result.current.press('forward');
      result.current.release();
      await pressing;
    });
    expect(send.mock.calls.map((c) => c[0])).toEqual([{ command: 'move', direction: 'forward', speed: 60, durationMs: 100 }]);
  });

  it('repeats pulses while held, one at a time, and stops on release', async () => {
    const send = jest.fn((_command: RobotRemoteCommandInput) => ok());
    const { result } = await renderHook(() => useDriveController(send, settings));
    let pressing!: Promise<void>;
    await act(async () => {
      pressing = result.current.press('left');
      await jest.advanceTimersByTimeAsync(250);
    });
    await act(async () => {
      result.current.release();
      await jest.advanceTimersByTimeAsync(100);
      await pressing;
    });
    const commands = send.mock.calls.map((c) => c[0]) as Array<Record<string, unknown>>;
    expect(commands.filter((c) => c.command === 'turn').length).toBeGreaterThanOrEqual(2);
    expect(commands.every((c) => c.command !== 'turn' || (c.direction === 'left' && c.durationMs === 100))).toBe(true);
    expect(commands[commands.length - 1]).toEqual({ command: 'stop' });
  });

  it('stops driving and shows the robot error when a pulse fails', async () => {
    const send = jest.fn((_command: RobotRemoteCommandInput) => Promise.reject(new Error('Robot is offline')));
    const { result } = await renderHook(() => useDriveController(send, settings));
    await act(async () => {
      await result.current.press('forward');
    });
    expect(result.current.error).toBe('Robot is offline');
    expect(result.current.active).toBeNull();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('does nothing without a connected robot', async () => {
    const { result } = await renderHook(() => useDriveController(null, settings));
    await act(async () => {
      await result.current.press('forward');
    });
    expect(result.current.active).toBeNull();
  });
});
