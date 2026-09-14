import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { agentMessageSchema, agentVoiceSchema, agentApprovalDecisionSchema } from '@personal-agent/shared';
import { getUserId } from '../../middleware/current-user';
import { parseOrThrow } from '../../middleware/validate';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../utils/errors';
import { processAgentMessage } from '../../ai/orchestration/engine';
import { executeApprovedRequest, rejectApprovalRequest } from '../../ai/tool-calling/executor';
import * as approvalsService from './approvals-service';

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
});

export default async function agentRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.post('/message', async (req, reply) => {
    const userId = getUserId(req);
    const input = parseOrThrow(agentMessageSchema, req.body);
    const result = await processAgentMessage({
      userId,
      conversationId: input.conversationId,
      message: input.message,
      source: 'text',
    });
    sendSuccess(reply, result);
  });

  app.post('/voice', async (req, reply) => {
    const userId = getUserId(req);
    const input = parseOrThrow(agentVoiceSchema, req.body);
    const result = await processAgentMessage({
      userId,
      conversationId: input.conversationId,
      message: input.transcript,
      source: 'voice',
    });
    sendSuccess(reply, result);
  });

  app.get('/approvals', async (req, reply) => {
    const userId = getUserId(req);
    const { page, limit, status } = parseOrThrow(listQuerySchema, req.query);
    const result = await approvalsService.listApprovals(userId, page, limit, status);
    sendSuccess(reply, result);
  });

  app.post('/approve', async (req, reply) => {
    const userId = getUserId(req);
    const input = parseOrThrow(agentApprovalDecisionSchema, req.body);
    try {
      const result = await executeApprovedRequest(userId, input.approvalId);
      sendSuccess(reply, result);
    } catch (err) {
      if (err instanceof Error && (err as { statusCode?: number }).statusCode === 404) {
        throw AppError.notFound('Approval request not found');
      }
      throw err;
    }
  });

  app.post('/reject', async (req, reply) => {
    const userId = getUserId(req);
    const input = parseOrThrow(agentApprovalDecisionSchema, req.body);
    try {
      await rejectApprovalRequest(userId, input.approvalId);
      sendSuccess(reply, { rejected: true });
    } catch (err) {
      if (err instanceof Error && (err as { statusCode?: number }).statusCode === 404) {
        throw AppError.notFound('Approval request not found');
      }
      throw err;
    }
  });
}
