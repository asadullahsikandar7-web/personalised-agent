export const ROBOT_STATUSES = ['offline', 'online', 'busy', 'error'] as const;
export type RobotStatus = (typeof ROBOT_STATUSES)[number];

export const ROBOT_MOVE_DIRECTIONS = ['forward', 'backward'] as const;
export type RobotMoveDirection = (typeof ROBOT_MOVE_DIRECTIONS)[number];

export const ROBOT_TURN_DIRECTIONS = ['left', 'right'] as const;
export type RobotTurnDirection = (typeof ROBOT_TURN_DIRECTIONS)[number];

export const ROBOT_COMMAND_TYPES = [
  'get_status',
  'get_battery',
  'get_sensors',
  'get_distance',
  'move',
  'turn',
  'stop',
  'set_speed',
  'capture_image',
  'get_camera_status',
] as const;
export type RobotCommandType = (typeof ROBOT_COMMAND_TYPES)[number];

export const ROBOT_COMMAND_STATUSES = ['pending', 'sent', 'acked', 'completed', 'failed', 'timeout'] as const;
export type RobotCommandStatus = (typeof ROBOT_COMMAND_STATUSES)[number];

/** Backend-enforced safety clamps - independent of whatever the ESP32 itself also enforces. */
export const ROBOT_SAFETY_LIMITS = {
  MAX_SPEED_PERCENT: 100,
  MIN_SPEED_PERCENT: 0,
  MAX_COMMAND_DURATION_MS: 5000,
  /** How long the backend waits for a command ack/result from the robot before giving up. */
  COMMAND_TIMEOUT_MS: 8000,
} as const;
