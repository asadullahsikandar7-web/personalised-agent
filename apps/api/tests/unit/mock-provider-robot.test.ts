import { describe, it, expect } from 'vitest';
import { MockProvider } from '../../src/ai/providers/mock-provider';
import type { AIMessage, AIToolDefinition } from '../../src/ai/providers/types';

const TOOLS: AIToolDefinition[] = [
  'create_reminder',
  'music_pause',
  'calculator',
  'list_robots',
  'get_robot_status',
  'get_robot_battery',
  'get_robot_sensors',
  'get_robot_distance',
  'move_robot',
  'turn_robot',
  'stop_robot',
  'set_robot_speed',
  'capture_robot_image',
  'get_robot_camera_status',
].map((name) => ({ name, description: 'd', parameters: {} }));

const provider = new MockProvider();

async function callsFor(messages: AIMessage[] | string) {
  const res = await provider.generateResponse({
    messages: typeof messages === 'string' ? [{ role: 'user', content: messages }] : messages,
    tools: TOOLS,
  });
  return res.toolCalls.map((c) => ({ name: c.name, args: c.arguments }));
}

describe('MockProvider robot commands', () => {
  it.each([
    ['robo status', 'get_robot_status'],
    ['give me robo status', 'get_robot_status'],
    ['Give me status of my robot', 'get_robot_status'],
    ['is my robot online?', 'get_robot_status'],
    ['status', 'get_robot_status'],
    ['robot', 'get_robot_status'],
    ['give me reading of ultrasonic sensor', 'get_robot_distance'],
    ['give me distance reading', 'get_robot_distance'],
    ['distance', 'get_robot_distance'],
    ['any obstacle ahead?', 'get_robot_distance'],
    ['how far is the wall', 'get_robot_distance'],
    ['robo battery', 'get_robot_battery'],
    ['battery level', 'get_robot_battery'],
    ['sensor readings', 'get_robot_sensors'],
    ['show me the IR sensors', 'get_robot_sensors'],
    ['camera status', 'get_robot_camera_status'],
    ['take a picture', 'capture_robot_image'],
    ['what do you see', 'capture_robot_image'],
    ['list my robots', 'list_robots'],
  ])('"%s" -> %s', async (text, tool) => {
    expect((await callsFor(text)).map((c) => c.name)).toEqual([tool]);
  });

  it('combines several readings in one request', async () => {
    expect((await callsFor('robo battery and distance')).map((c) => c.name)).toEqual(['get_robot_distance', 'get_robot_battery']);
  });

  it('gives every reading for "all readings"', async () => {
    expect((await callsFor('give me all readings')).map((c) => c.name)).toEqual([
      'get_robot_status',
      'get_robot_distance',
      'get_robot_sensors',
      'get_robot_battery',
    ]);
  });

  it.each([
    ['forward', { direction: 'forward' }],
    ['move forward', { direction: 'forward' }],
    ['go back 2 seconds', { direction: 'backward', durationMs: 2000 }],
    ['robo move forward at 60% for 1.5 seconds', { direction: 'forward', speed: 60, durationMs: 1500 }],
    ['reverse for 10 seconds', { direction: 'backward', durationMs: 5000 }],
  ])('"%s" moves with %o', async (text, args) => {
    expect(await callsFor(text)).toEqual([{ name: 'move_robot', args }]);
  });

  it.each([
    ['turn left', { direction: 'left' }],
    ['right', { direction: 'right' }],
    ['rotate right for 500ms', { direction: 'right', durationMs: 500 }],
  ])('"%s" turns with %o', async (text, args) => {
    expect(await callsFor(text)).toEqual([{ name: 'turn_robot', args }]);
  });

  it('stops on "stop" / "halt" but not "stop the music"', async () => {
    expect((await callsFor('stop')).map((c) => c.name)).toEqual(['stop_robot']);
    expect((await callsFor('halt the robot')).map((c) => c.name)).toEqual(['stop_robot']);
    expect((await callsFor('stop the music')).map((c) => c.name)).toEqual(['music_pause']);
  });

  it('sets speed', async () => {
    expect(await callsFor('set speed to 45')).toEqual([{ name: 'set_robot_speed', args: { speed: 45 } }]);
  });

  it.each(['is that right?', 'what is the status of my order', 'remind me to go back home at 5 PM'])(
    'does not treat "%s" as a robot command',
    async (text) => {
      expect((await callsFor(text)).every((c) => !c.name.includes('robot'))).toBe(true);
    },
  );

  it('answers "robot help" with the command list', async () => {
    const res = await provider.generateResponse({ messages: [{ role: 'user', content: 'robot help' }], tools: TOOLS });
    expect(res.toolCalls).toHaveLength(0);
    expect(res.content).toMatch(/ultrasonic reading/);
  });

  describe('after "Which one do you mean?"', () => {
    const question: AIMessage = {
      role: 'assistant',
      content: 'You have 2 robots. Which one do you mean?\n1. Robo Freenove Pi (online)\n2. Robo (offline)\nReply with the robot\'s number or name.',
    };
    const convo = (reply: string): AIMessage[] => [{ role: 'user', content: 'ultrasonic reading' }, question, { role: 'user', content: reply }];

    it.each([
      ['1', '1'],
      ['the second one', '2'],
      ['freenove', 'freenove'],
    ])('reply "%s" re-runs the request for robot %s', async (reply, robotId) => {
      expect(await callsFor(convo(reply))).toEqual([{ name: 'get_robot_distance', args: { robotId } }]);
    });

    it('treats a new command as a new request', async () => {
      expect(await callsFor(convo('stop'))).toEqual([{ name: 'stop_robot', args: {} }]);
    });
  });
});

describe('MockProvider robot references inside a command', () => {
  it.each([
    ['give me distance reading of 1st robot', 'get_robot_distance', '1'],
    ['second robot status', 'get_robot_status', '2'],
    ['robot 2 battery', 'get_robot_battery', '2'],
    ['tell me my connected robo distance', 'get_robot_distance', 'connected'],
  ])('"%s" -> %s for robot %s', async (text, tool, robotId) => {
    expect(await callsFor(text)).toEqual([{ name: tool, args: { robotId } }]);
  });

  it('reads "robo forward 2 seconds" as a duration, not robot #2', async () => {
    expect(await callsFor('robo forward 2 seconds')).toEqual([{ name: 'move_robot', args: { direction: 'forward', durationMs: 2000 } }]);
  });
});
