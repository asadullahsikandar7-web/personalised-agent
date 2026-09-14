import type { FastifyInstance } from 'fastify';
import { getUserId } from '../../middleware/current-user';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../utils/errors';
import { getToolRegistry } from '../../ai/tools';
import { toolInputJsonSchema } from '../../ai/tool-calling/adapter';
import { executeToolCall } from '../../ai/tool-calling/executor';
import { UserModel } from '../../db/models';
import type { ToolDescriptor } from '@personal-agent/shared';

export default async function toolsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (_req, reply) => {
    const tools = getToolRegistry().list();
    const descriptors: ToolDescriptor[] = tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      permissionLevel: tool.permissionLevel,
      inputJsonSchema: toolInputJsonSchema(tool),
    }));
    sendSuccess(reply, descriptors);
  });

  app.get('/:name', async (req, reply) => {
    const { name } = req.params as { name: string };
    const tool = getToolRegistry().get(name);
    if (!tool) throw AppError.notFound(`Tool "${name}" not found`);
    const descriptor: ToolDescriptor = {
      name: tool.name,
      description: tool.description,
      permissionLevel: tool.permissionLevel,
      inputJsonSchema: toolInputJsonSchema(tool),
    };
    sendSuccess(reply, descriptor);
  });

  app.post('/:name/execute', async (req, reply) => {
    const userId = getUserId(req);
    const { name } = req.params as { name: string };
    const user = await UserModel.findById(userId);
    const outcome = await executeToolCall(name, req.body ?? {}, {
      userId,
      timezone: user?.timezone ?? 'UTC',
      isApprovedExecution: false,
    });
    const statusCode = outcome.status === 'awaiting_approval' ? 202 : outcome.status === 'failed' ? 422 : 200;
    sendSuccess(reply, outcome, statusCode);
  });
}
