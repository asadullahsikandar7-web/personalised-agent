import { ToolRegistry } from './registry';
import { getCurrentDatetimeTool } from './definitions/datetime';
import { calculatorTool } from './definitions/calculator';
import { webSearchTool } from './definitions/web-search';
import { openUrlTool } from './definitions/open-url';
import { createNoteTool, listNotesTool, updateNoteTool, deleteNoteTool } from './definitions/notes';
import { rememberMemoryTool, listMemoriesTool, updateMemoryTool, deleteMemoryTool } from './definitions/memory';
import { createTaskTool, listTasksTool, updateTaskTool, completeTaskTool, deleteTaskTool } from './definitions/tasks';
import {
  createReminderTool,
  listRemindersTool,
  updateReminderTool,
  cancelReminderTool,
  snoozeReminderTool,
  completeReminderTool,
} from './definitions/reminders';
import {
  musicPlayTool,
  musicPauseTool,
  musicResumeTool,
  musicNextTool,
  musicPreviousTool,
  musicSearchTool,
} from './definitions/music';
import { searchMusicCatalogTool } from './definitions/music-search';
import { getActivityTool } from './definitions/activity';
import { sendMessageTool } from './definitions/send-message';
import {
  listRobotsTool,
  getRobotStatusTool,
  getRobotBatteryTool,
  getRobotSensorsTool,
  getRobotDistanceTool,
  moveRobotTool,
  turnRobotTool,
  stopRobotTool,
  setRobotSpeedTool,
  captureRobotImageTool,
  getRobotCameraStatusTool,
} from './definitions/robot';

let registry: ToolRegistry | null = null;

/**
 * Builds (once) and returns the default tool registry containing every tool the agent can call.
 * To add a new tool: write ai/tools/definitions/<name>.ts exporting a defineTool(...) result,
 * then register it here. Nothing else in the app needs to change. See docs/tool-development.md.
 */
export function getToolRegistry(): ToolRegistry {
  if (registry) return registry;
  registry = new ToolRegistry();

  registry.register(getCurrentDatetimeTool);
  registry.register(calculatorTool);
  registry.register(webSearchTool);
  registry.register(openUrlTool);

  registry.register(createNoteTool);
  registry.register(listNotesTool);
  registry.register(updateNoteTool);
  registry.register(deleteNoteTool);

  registry.register(rememberMemoryTool);
  registry.register(listMemoriesTool);
  registry.register(updateMemoryTool);
  registry.register(deleteMemoryTool);

  registry.register(createTaskTool);
  registry.register(listTasksTool);
  registry.register(updateTaskTool);
  registry.register(completeTaskTool);
  registry.register(deleteTaskTool);

  registry.register(createReminderTool);
  registry.register(listRemindersTool);
  registry.register(updateReminderTool);
  registry.register(cancelReminderTool);
  registry.register(snoozeReminderTool);
  registry.register(completeReminderTool);

  registry.register(musicPlayTool);
  registry.register(musicPauseTool);
  registry.register(musicResumeTool);
  registry.register(musicNextTool);
  registry.register(musicPreviousTool);
  registry.register(musicSearchTool);
  registry.register(searchMusicCatalogTool);

  registry.register(getActivityTool);
  registry.register(sendMessageTool);

  registry.register(listRobotsTool);

  registry.register(getRobotStatusTool);
  registry.register(getRobotBatteryTool);
  registry.register(getRobotSensorsTool);
  registry.register(getRobotDistanceTool);
  registry.register(moveRobotTool);
  registry.register(turnRobotTool);
  registry.register(stopRobotTool);
  registry.register(setRobotSpeedTool);
  registry.register(captureRobotImageTool);
  registry.register(getRobotCameraStatusTool);

  return registry;
}

export * from './types';
export * from './registry';
