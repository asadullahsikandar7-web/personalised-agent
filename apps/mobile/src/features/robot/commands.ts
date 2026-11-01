/**
 * Robot-aware helpers for the chat screens. The agent understands plain keywords ("robo status",
 * "distance", "turn left" - see MockProvider.matchRobotCommands on the API), so quick commands
 * are just pre-written messages sent through the normal agent pipeline, never direct robot calls:
 * movement still goes through the agent's approval gate.
 */
export interface QuickCommand {
  label: string;
  message: string;
}

export const ROBOT_QUICK_COMMANDS: QuickCommand[] = [
  { label: '🤖 Status', message: 'robo status' },
  { label: '📏 Distance', message: 'ultrasonic distance reading' },
  { label: '📡 Sensors', message: 'sensor readings' },
  { label: '📊 All readings', message: 'give me all readings' },
  { label: '🔋 Battery', message: 'robo battery' },
  { label: '📷 Camera', message: 'camera status' },
  { label: '⏹️ Stop', message: 'stop the robot' },
  { label: '❓ Help', message: 'robot help' },
];

export interface RobotChoice {
  number: number;
  name: string;
  status: string;
}

/**
 * Pulls the numbered "1. Robo Freenove Pi (online)" choices out of an agent reply that asks
 * "Which one do you mean?" (resolveRobotId on the API), so the screen can show them as buttons.
 */
export function parseRobotChoices(content: string): RobotChoice[] {
  if (!content.includes('Which one do you mean?')) return [];
  return [...content.matchAll(/^(\d+)\.\s+(.+?)\s+\(([^)]*)\)$/gm)].map((m) => ({
    number: Number(m[1]),
    name: m[2]!,
    status: m[3]!,
  }));
}

const TOOL_LABELS: Record<string, string> = {
  list_robots: '🤖 Robots',
  get_robot_status: '🤖 Status',
  get_robot_battery: '🔋 Battery',
  get_robot_sensors: '📡 Sensors',
  get_robot_distance: '📏 Distance',
  get_robot_camera_status: '📷 Camera',
  capture_robot_image: '📸 Photo',
  move_robot: '🚗 Move',
  turn_robot: '↪️ Turn',
  stop_robot: '⏹️ Stop',
  set_robot_speed: '⚡ Speed',
};

/** "get_robot_distance" -> "📏 Distance"; other tools -> "create task". */
export function friendlyToolName(toolName: string): string {
  return TOOL_LABELS[toolName] ?? toolName.replace(/_/g, ' ');
}
