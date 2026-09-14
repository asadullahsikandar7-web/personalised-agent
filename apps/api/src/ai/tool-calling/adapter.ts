import { zodToJsonSchema } from 'zod-to-json-schema';
import type { AgentTool } from '../tools/types';
import type { AIToolDefinition } from '../providers/types';

/**
 * Converts registered AgentTool definitions into the provider-agnostic AIToolDefinition shape
 * (JSON Schema parameters) that AIModelProvider implementations understand. This is the only
 * place Zod schemas are turned into JSON Schema for the model - keeps providers decoupled from
 * how tool input validation is implemented internally.
 *
 * The zod-to-json-schema call is routed through an `unknown`-typed wrapper because some tool
 * schemas' generic depth otherwise triggers TS2589 ("type instantiation excessively deep") -
 * a known interaction between zod's recursive types and this library's own conditional types.
 * Runtime behavior is unaffected; only the static type is widened for this one call.
 */
const zodToJsonSchemaUntyped = zodToJsonSchema as (schema: unknown, opts?: unknown) => Record<string, unknown>;

export function toolInputJsonSchema(tool: AgentTool<unknown, unknown>): Record<string, unknown> {
  return zodToJsonSchemaUntyped(tool.inputSchema, { target: 'openApi3' });
}

export function toAIToolDefinitions(tools: AgentTool<unknown, unknown>[]): AIToolDefinition[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: toolInputJsonSchema(tool),
  }));
}
