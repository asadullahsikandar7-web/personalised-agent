import type { RobotStatus, RobotCommandType, RobotCommandStatus } from '../constants/robot';

export interface RobotDTO {
  id: string;
  name: string;
  deviceId: string;
  status: RobotStatus;
  battery: number | null;
  distanceCm: number | null;
  firmwareVersion: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Only returned once, at registration time - never retrievable again (same pattern as a
 *  password: the server keeps only a hash of it). */
export interface RobotRegistrationResultDTO {
  robot: RobotDTO;
  pairingToken: string;
}

export interface RobotCommandDTO {
  id: string;
  robotId: string;
  type: RobotCommandType;
  input: Record<string, unknown>;
  status: RobotCommandStatus;
  result?: unknown;
  errorMessage?: string | null;
  createdAt: string;
}

/** What the robot answered to a remote-control command. */
export interface RobotRemoteCommandResultDTO {
  message: string | null;
  data: unknown;
}
