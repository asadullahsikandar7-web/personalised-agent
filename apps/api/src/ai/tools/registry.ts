import type { AgentTool } from './types';

/**
 * Central, dynamic registry of every tool the agent can call. New tools are added by writing
 * one file under ai/tools/definitions and registering it in ai/tools/index.ts - nothing else in
 * the orchestration engine, providers, or API routes needs to change. See docs/tool-development.md.
 */
export class ToolRegistry {
  private tools = new Map<string, AgentTool<unknown, unknown>>();

  register<Input, Output>(tool: AgentTool<Input, Output>): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered`);
    }
    this.tools.set(tool.name, tool as AgentTool<unknown, unknown>);
  }

  get(name: string): AgentTool<unknown, unknown> | undefined {
    return this.tools.get(name);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  list(): AgentTool<unknown, unknown>[] {
    return Array.from(this.tools.values());
  }

  names(): string[] {
    return Array.from(this.tools.keys());
  }
}
