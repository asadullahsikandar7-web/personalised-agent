import type { AIModelProvider, AIRequest, AIResponse, AIToolCall } from './types';
import { randomUUID } from 'node:crypto';

/**
 * Deterministic, offline provider used for local development, CI, and unit/integration tests
 * where no OpenAI API key is configured. It performs light pattern-matching over the latest
 * user message to decide whether to answer directly or propose tool calls, so the full
 * orchestration -> tool-registry -> approval pipeline can be exercised end-to-end without any
 * network access or vendor API key.
 */
export class MockProvider implements AIModelProvider {
  getProviderName(): string {
    return 'mock';
  }

  supportsToolCalling(): boolean {
    return true;
  }

  async generateResponse(input: AIRequest): Promise<AIResponse> {
    // Synthesis pass: the orchestrator appends tool-role messages after executing tool calls and
    // asks the provider for a final natural-language reply. A real LLM reads those results and
    // writes prose; the mock provider summarizes them directly instead.
    const lastMessage = input.messages[input.messages.length - 1];
    if (lastMessage?.role === 'tool') {
      const toolMessages = [...input.messages].reverse();
      const trailing: typeof input.messages = [];
      for (const m of toolMessages) {
        if (m.role !== 'tool') break;
        trailing.unshift(m);
      }
      return {
        content: summarizeToolResults(trailing),
        toolCalls: [],
        finishReason: 'stop',
        providerName: this.getProviderName(),
      };
    }

    const lastUser = [...input.messages].reverse().find((m) => m.role === 'user');
    const text = (lastUser?.content ?? '').trim();
    const availableTools = new Set((input.tools ?? []).map((t) => t.name));

    let toolCalls = answerRobotSelection(input.messages, availableTools);
    if (toolCalls.length === 0) toolCalls = matchToolCalls(text, availableTools);
    let content = '';

    if (toolCalls.length === 0) {
      content = ROBOT_HELP_REQUEST.test(text) ? ROBOT_HELP_REPLY : buildFallbackReply(text);
    }

    return {
      content,
      toolCalls,
      finishReason: toolCalls.length > 0 ? 'tool_calls' : 'stop',
      providerName: this.getProviderName(),
    };
  }

  async streamResponse(input: AIRequest, onToken: (token: string) => void): Promise<AIResponse> {
    const result = await this.generateResponse(input);
    if (result.content) {
      for (const word of result.content.split(' ')) {
        onToken(word + ' ');
      }
    }
    return result;
  }
}

/** Pattern-matches one user utterance to the tool calls it implies (empty when none apply). */
function matchToolCalls(text: string, availableTools: Set<string>): AIToolCall[] {
  const lower = text.toLowerCase();
  const toolCalls: AIToolCall[] = [];
  const has = (name: string) => availableTools.has(name);

  if (has('get_current_datetime') && /\b(what.*time|what.*date|current time|today'?s date)\b/i.test(lower)) {
    toolCalls.push(makeCall('get_current_datetime', {}));
  } else if (has('create_reminder') && /\bremind me\b|\bset a reminder\b|\breminder\b.*\bat\b/i.test(lower)) {
    toolCalls.push(makeCall('create_reminder', extractReminder(text)));
  } else if (has('list_reminders') && /\bwhat.*scheduled\b|\bupcoming reminders\b|\bmy reminders\b/i.test(lower)) {
    toolCalls.push(makeCall('list_reminders', {}));
  } else if (has('create_task') && /\bcreate a task\b|\badd a task\b|\bnew task\b/i.test(lower)) {
    toolCalls.push(makeCall('create_task', extractTask(text)));
  } else if (has('list_tasks') && /\bpending tasks\b|\bmy tasks\b|\bsummarize.*tasks\b/i.test(lower)) {
    toolCalls.push(makeCall('list_tasks', {}));
  } else if (has('remember_memory') && /\bremember that\b|\bremember my\b|\bremember i\b/i.test(lower)) {
    toolCalls.push(makeCall('remember_memory', extractMemory(text)));
  } else if (has('list_memories') && /\bwhat did i ask you to remember\b|\bmy memories\b/i.test(lower)) {
    toolCalls.push(makeCall('list_memories', {}));
  } else if (has('calculator') && /^[\s\d+\-*/().]+$|\bcalculate\b|\bwhat is\b.*[\d]/i.test(lower) && /[\d]/.test(lower)) {
    const expr = extractMathExpression(text);
    if (expr) toolCalls.push(makeCall('calculator', { expression: expr }));
  } else if (
    has('search_music_catalog') &&
    /\bfind (a )?song\b|\bsearch for (a )?song\b|\bsearch music\b|\bfind music by\b|\blook up (a )?song\b/i.test(lower)
  ) {
    toolCalls.push(makeCall('search_music_catalog', { query: extractSongQuery(text) }));
  } else if (has('music_play') && /\bplay\b.*\bmusic\b|\bplay my\b|\bplay a?\s*playlist\b/i.test(lower)) {
    toolCalls.push(makeCall('music_play', {}));
  } else if (has('music_pause') && /\bpause\b(.*music)?\b|\bstop the music\b/i.test(lower)) {
    toolCalls.push(makeCall('music_pause', {}));
  } else if (has('get_activity') && /\brecent (agent )?activity\b/i.test(lower)) {
    toolCalls.push(makeCall('get_activity', {}));
  } else if (has('send_message') && /\bsend (this|a) message\b/i.test(lower)) {
    toolCalls.push(makeCall('send_message', { body: text }));
  } else if (has('web_search') && /\bsearch (the web|online) for\b/i.test(lower)) {
    toolCalls.push(makeCall('web_search', { query: text.replace(/.*search (the web|online) for/i, '').trim() }));
  }

  // Robot commands come last so a reminder or task that merely mentions "stop" or "go back"
  // (e.g. "remind me to go back home at 5 PM") is never read as a motion command.
  return toolCalls.length > 0 ? toolCalls : matchRobotCommands(lower, has);
}

/**
 * Mirrors what an LLM does after a robot tool asks "Which one do you mean?" (see
 * resolveRobotId): when the reply picks one of the listed robots ("2", "freenove"), re-runs the
 * request that triggered the question with robotId set to it. Any other reply is handled as a
 * fresh request, so "stop" right after the question still stops instead of being read as a name.
 */
function answerRobotSelection(messages: AIRequest['messages'], availableTools: Set<string>): AIToolCall[] {
  const lastUserIndex = messages.map((m) => m.role).lastIndexOf('user');
  const question = messages[lastUserIndex - 1];
  if (question?.role !== 'assistant' || !question.content.includes('Which one do you mean?')) return [];
  const originalRequest = messages
    .slice(0, lastUserIndex - 1)
    .reverse()
    .find((m) => m.role === 'user');
  if (!originalRequest) return [];

  const listedNames = [...question.content.matchAll(/^\d+\.\s+(.+?)\s+\([^)]*\)$/gm)].map((m) => m[1]!.toLowerCase());
  const choice = messages[lastUserIndex]!.content.trim()
    .replace(/^(the|number|#)\s*/i, '')
    .replace(/^(robot|robo)\s+(?=\d+$)/i, '')
    .replace(/\s+(one|robot)$/i, '')
    .replace(/[.!]$/, '');
  const ordinal = ORDINALS[choice.toLowerCase()];
  const pickedNumber = ordinal ?? (/^\d+$/.test(choice) ? Number(choice) : undefined);
  const lowerChoice = choice.toLowerCase();
  const isListedChoice =
    (pickedNumber !== undefined && pickedNumber >= 1 && pickedNumber <= listedNames.length) ||
    (lowerChoice.length > 0 && listedNames.some((name) => name === lowerChoice || name.includes(lowerChoice)));
  if (!isListedChoice) return [];

  const robotId = pickedNumber !== undefined ? String(pickedNumber) : choice;
  return matchToolCalls(originalRequest.content, availableTools)
    .filter((call) => call.name.includes('robot'))
    .map((call) => ({ ...call, arguments: { ...(call.arguments as object), robotId } }));
}

const ORDINALS: Record<string, number> = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
  one: 1,
  two: 2,
  three: 3,
  '1': 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
};

const ROBOT_WORD = /\b(robot|robo|bot|rover)s?\b|\brobot'?s\b/;
const CORE_FILLER = new Set(
  "a an the my me your give get show tell what whats what's is are please can could you of on for at to from with and current now reading readings level value check first second third connected online active live number no".split(
    ' ',
  ),
);
const NOT_ROBOT_STOP = /\b(music|song|playing|playback|reminder|alarm|timer)\b/;

/**
 * Keyword-level understanding of robot commands - short phrases like "robo status", "ultrasonic
 * reading", "distance", "forward 2 seconds" or "turn left" work as well as full sentences. Motion
 * (stop / speed / move / turn) is a single command; read-only queries can be combined ("battery
 * and distance") and each becomes its own tool call. Speeds and durations are clamped to the
 * robot safety limits the tool schemas enforce, so a request for "10 seconds" still runs (for 5s)
 * instead of failing validation.
 */
function matchRobotCommands(lower: string, has: (name: string) => boolean): AIToolCall[] {
  const robotId = extractRobotReference(lower);
  // "connected robo" names *which* robot - don't also read "connected" as a status question.
  const command = lower.replace(/\b(connected|online|active|live)\s+(?=(robot|robo|bot)\b)/g, '');
  return matchRobotCommandsFor(command, has).map((call) =>
    robotId && call.name !== 'list_robots' ? { ...call, arguments: { ...(call.arguments as object), robotId } } : call,
  );
}

/**
 * A robot named inside the request itself - "distance of the 1st robot", "robot 2 status",
 * "my connected robo" - so the agent doesn't have to ask which one. Numbers followed by a unit
 * ("robot 2 seconds forward") are motion parameters, not robot numbers.
 */
function extractRobotReference(lower: string): string | undefined {
  const ordinal = lower.match(/\b(1st|first|2nd|second|3rd|third|4th|fourth|5th|fifth)\s+(robot|robo|bot|one)\b/);
  if (ordinal) return String(ORDINALS[ordinal[1]!.replace(/^(\d).*/, '$1')] ?? ordinal[1]!.replace(/\D/g, ''));
  const numbered = lower.match(
    /\b(robot|robo|bot)\s*(?:#|no\.?|number)?\s*(\d{1,2})\b(?!\s*(%|percent|ms|millisecond|s\b|sec|second|cm))/,
  );
  if (numbered) return numbered[2];
  if (/\b(connected|online|active|live)\s+(robot|robo|bot)\b/.test(lower)) return 'connected';
  return undefined;
}

function matchRobotCommandsFor(lower: string, has: (name: string) => boolean): AIToolCall[] {
  const mentionsRobot = ROBOT_WORD.test(lower);
  // The request with filler, robot names and motion parameters removed: "robo status please" ->
  // ["status"], "forward 2 seconds at 50%" -> ["forward"]. A bare keyword is only trusted as a
  // robot command when it is (almost) the whole message, so "is that right?" never turns the robot.
  const core = lower
    .replace(/\d+(\.\d+)?\s*(%|percent|milliseconds?|ms|seconds?|secs?|s\b)?/g, ' ')
    .replace(/[^a-z'\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !CORE_FILLER.has(w) && !ROBOT_WORD.test(w));
  const isBare = core.length <= 1;
  const robotContext = mentionsRobot || isBare;

  if (has('stop_robot') && /\b(stop|halt|freeze|brake|emergency)\b/.test(lower) && !NOT_ROBOT_STOP.test(lower)) {
    return [makeCall('stop_robot', {})];
  }
  if (has('set_robot_speed') && /\b(set|change|make)\b.*\bspeed\b|\bspeed\b\s*(to\s*)?\d+/.test(lower)) {
    const speed = extractSpeed(lower) ?? extractNumber(lower);
    if (speed !== undefined) return [makeCall('set_robot_speed', { speed })];
  }
  const moveDirection = /\b(forward|forwards|ahead|straight)\b/.test(lower)
    ? 'forward'
    : /\b(backward|backwards|reverse)\b|\b(move|go|drive|come|back up)\b.*\bback\b|^back\b/.test(lower)
      ? 'backward'
      : undefined;
  if (has('move_robot') && moveDirection && (mentionsRobot || /\b(move|go|drive|run|head|roll|come)\b/.test(lower) || isBare)) {
    return [makeCall('move_robot', { direction: moveDirection, ...extractMotionParams(lower) })];
  }
  const turnDirection = /\bleft\b/.test(lower) ? 'left' : /\bright\b/.test(lower) ? 'right' : undefined;
  if (has('turn_robot') && turnDirection && (/\b(turn|rotate|spin|go|steer|face)\b/.test(lower) || isBare)) {
    const { durationMs } = extractMotionParams(lower);
    return [makeCall('turn_robot', { direction: turnDirection, ...(durationMs ? { durationMs } : {}) })];
  }

  if (has('list_robots') && /\b(list|show|all)\b.*\brobots\b|\b(which|what|how many) robots\b|\bmy robots\b/.test(lower)) {
    return [makeCall('list_robots', {})];
  }

  const calls: AIToolCall[] = [];
  const add = (name: string) => {
    if (has(name) && !calls.some((c) => c.name === name)) calls.push(makeCall(name, {}));
  };
  const wantsEverything =
    /\b(all|every|full|complete)\b.*\b(readings?|sensors?|report|details|info|data)\b|\beverything\b|\bfull report\b/.test(lower);

  if (wantsEverything && (robotContext || /\b(readings?|sensors?)\b/.test(lower))) {
    ['get_robot_status', 'get_robot_distance', 'get_robot_sensors', 'get_robot_battery'].forEach(add);
    return calls;
  }
  if (/\b(ultra ?sonic|sonar|distance|obstacles?|how far|proximity|range|clearance)\b/.test(lower)) add('get_robot_distance');
  if (/\b(battery|batteries|charge|charging|power level|voltage)\b/.test(lower) && robotContext) add('get_robot_battery');
  if (
    /\b(infrared|ir|line ?(track\w*|sensor\w*|follow\w*)|imu|gyro\w*|accelerometer|tilt|orientation)\b/.test(lower) ||
    (/\b(sensors?|readings?|measurements?)\b/.test(lower) && !calls.length && robotContext)
  ) {
    add('get_robot_sensors');
  }
  if (/\b(camera|cam)\b/.test(lower) && /\b(status|working|connected|ok|okay|on|online|available|check)\b/.test(lower)) {
    add('get_robot_camera_status');
  } else if (
    /\b(picture|photo|snapshot|snap|capture|image|pic)\b|\bwhat (do|can) you see\b|\blook around\b|\bshow me what\b/.test(
      lower,
    ) &&
    (mentionsRobot || /\b(take|capture|snap|grab|click)\b/.test(lower) || /\bsee\b/.test(lower))
  ) {
    add('capture_robot_image');
  }
  if (
    (/\b(status|online|offline|connected|alive|state|health|ping|condition)\b/.test(lower) && robotContext) ||
    (mentionsRobot &&
      calls.length === 0 &&
      /\b(how|check|is|are|what'?s?|give|tell|show|get|report)\b|^\W*(robot|robo|bot)\W*$/.test(lower))
  ) {
    add('get_robot_status');
  }
  return calls;
}

const ROBOT_HELP_REQUEST =
  /\b(robot|robo|bot)\b.*\b(help|commands?|what can|options|how do i|how to)\b|\b(help|commands?|what can)\b.*\b(robot|robo|bot)\b/i;
const ROBOT_HELP_REPLY = `Here's what I can do with your robot - short keywords work too:
- Status: "robo status", "is my robot online?"
- Distance: "ultrasonic reading", "distance", "any obstacle ahead?"
- Sensors: "sensor readings", "IR sensors", or "all readings" for everything at once
- Battery: "robo battery"
- Camera: "camera status", "take a picture"
- Move: "forward", "go back 2 seconds", "move forward at 60%"
- Turn: "turn left", "right 1 second"
- Stop: "stop" (always runs immediately)
- Speed: "set speed to 50"
Moving, turning and speed changes ask for your approval first. If you have several robots, I'll ask which one.`;

function extractSpeed(lower: string): number | undefined {
  const match = lower.match(/(\d{1,3})\s*(%|percent)/) ?? lower.match(/\bspeed\b\s*(?:to|of|at)?\s*(\d{1,3})\b/);
  return match ? Math.min(100, Math.max(0, Number(match[1]))) : undefined;
}

function extractNumber(lower: string): number | undefined {
  const match = lower.match(/\b(\d{1,3})\b/);
  return match ? Math.min(100, Math.max(0, Number(match[1]))) : undefined;
}

function extractMotionParams(lower: string): { speed?: number; durationMs?: number } {
  const params: { speed?: number; durationMs?: number } = {};
  const speed = extractSpeed(lower);
  if (speed !== undefined) params.speed = speed;
  const duration = lower.match(/(\d+(?:\.\d+)?)\s*(ms|millisecond|milliseconds|s|sec|secs|second|seconds)\b/);
  if (duration) {
    const value = Number(duration[1]);
    const ms = duration[2]!.startsWith('m') ? value : value * 1000;
    params.durationMs = Math.round(Math.min(5000, Math.max(1, ms)));
  }
  return params;
}

function makeCall(name: string, args: unknown): AIToolCall {
  return { id: randomUUID(), name, arguments: args };
}

function summarizeToolResults(toolMessages: { content: string; name?: string }[]): string {
  const parts = toolMessages.map((m) => {
    try {
      const parsed = JSON.parse(m.content) as { success?: boolean; message?: string };
      return parsed.message ?? m.content;
    } catch {
      return m.content;
    }
  });
  // Several robot readings for an ambiguous robot each ask the same "which one?" question - say it once.
  return [...new Set(parts)].join('\n');
}

function buildFallbackReply(text: string): string {
  if (!text) return "I didn't catch that - could you say it again?";
  return `I heard: "${text}". I can create tasks and reminders, remember information, check your schedule, control basic music playback and your robot (say "robot help" for its commands), or just chat. What would you like me to do?`;
}

function extractReminder(text: string): { title: string; scheduledAt: string } {
  const forMatch = text.match(/(?:remind me to|reminder to)\s+(.*?)(?:\s+at\s+|\s+every\s+|\s+tomorrow|\s+today|$)/i);
  return {
    title: forMatch?.[1]?.trim() || text,
    scheduledAt: parseTimeExpression(text).toISOString(),
  };
}

/**
 * Lightweight natural-language time parser used only by MockProvider (a real LLM would return
 * a structured ISO datetime directly via tool calling). Understands "at H(:MM) AM/PM" plus an
 * optional "tomorrow"/"today", defaulting to the next occurrence of that time if it has already
 * passed today. This is best-effort NLU, not a full date parser - see docs/known-platform-limitations.md.
 */
function parseTimeExpression(text: string): Date {
  const now = new Date();
  const result = new Date(now);

  const timeMatch = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (timeMatch) {
    let hour = Number(timeMatch[1]);
    const minute = timeMatch[2] ? Number(timeMatch[2]) : 0;
    const meridiem = timeMatch[3]?.toLowerCase();
    if (meridiem === 'pm' && hour < 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;
    result.setHours(hour, minute, 0, 0);
  } else {
    // No explicit time found - default to one hour from now so the reminder is still valid.
    result.setTime(now.getTime() + 60 * 60_000);
  }

  if (/\btomorrow\b/i.test(text)) {
    result.setDate(result.getDate() + 1);
  } else if (!/\btoday\b/i.test(text) && result.getTime() <= now.getTime()) {
    // An unqualified time that has already passed today means tomorrow.
    result.setDate(result.getDate() + 1);
  }

  return result;
}

function extractTask(text: string): { title: string } {
  const match = text.match(/(?:create a task(?: called| for| to)?|add a task(?: called| for| to)?)\s+(.*)/i);
  return { title: match?.[1]?.trim().replace(/^["']|["']$/g, '') || text };
}

function extractMemory(text: string): { key: string; value: string } {
  const match = text.match(/remember (?:that\s+)?(.*)/i);
  const value = match?.[1]?.trim() || text;
  return { key: value.slice(0, 60), value };
}

function extractMathExpression(text: string): string | null {
  const match = text.match(/[\d.\s+\-*/()]{2,}/);
  return match ? match[0].trim() : null;
}

function extractSongQuery(text: string): string {
  const match = text.match(/(?:find|search for|search|look up)\s+(?:a\s+)?song(?:s)?\s+(?:by|called|named)?\s*(.*)/i);
  return match?.[1]?.trim().replace(/^["']|["']$/g, '') || text;
}
