import { ConversationModel, MessageModel, UserModel } from '../../db/models';
import { getAIProvider } from '../providers/factory';
import type { AIMessage } from '../providers/types';
import { getToolRegistry } from '../tools';
import { toAIToolDefinitions } from '../tool-calling/adapter';
import { executeToolCall } from '../tool-calling/executor';
import { buildSystemPrompt } from '../prompts/system-prompt';
import { getRelevantMemoriesText } from './memory-context';
import {
  createConversation,
  getConversationOrThrow,
  touchConversation,
  maybeAutoTitle,
} from '../../modules/conversations/service';
import { toMessageDTO } from '../../modules/messages/service';
import { logActivity } from '../../modules/activity/service';
import { AppError } from '../../utils/errors';
import type { MessageDTO, ToolCallDTO } from '@personal-agent/shared';

const MAX_HISTORY_MESSAGES = 20;

export interface ProcessAgentMessageInput {
  userId: string;
  conversationId?: string;
  message: string;
  source: 'text' | 'voice';
}

export interface ProcessAgentMessageResult {
  conversationId: string;
  userMessage: MessageDTO;
  assistantMessage: MessageDTO;
  pendingApprovalIds: string[];
}

/**
 * The full agent orchestration pipeline described in docs/architecture.md:
 * intake -> load context -> retrieve memory -> generate response -> detect tool calls ->
 * validate + permission-check + (maybe) request approval -> execute -> feed results back ->
 * final response -> persist -> log activity.
 */
export async function processAgentMessage(input: ProcessAgentMessageInput): Promise<ProcessAgentMessageResult> {
  const user = await UserModel.findById(input.userId);
  if (!user) throw AppError.notFound('User not found');

  const conversation = input.conversationId
    ? await getConversationOrThrow(input.userId, input.conversationId)
    : await createConversation(input.userId);

  const userMessageDoc = await MessageModel.create({
    conversationId: conversation._id,
    userId: input.userId,
    role: 'user',
    content: input.message,
  });
  await touchConversation(conversation._id.toString(), input.message);
  await maybeAutoTitle(conversation, input.message);

  const history = await MessageModel.find({ conversationId: conversation._id })
    .sort({ createdAt: -1 })
    .limit(MAX_HISTORY_MESSAGES);
  const orderedHistory = history.reverse();

  const memoriesText = await getRelevantMemoriesText(input.userId);
  const systemPrompt = `${buildSystemPrompt({
    userName: user.name,
    timezone: user.timezone,
    nowIso: new Date().toISOString(),
  })}\n\nRelevant saved memories:\n${memoriesText}`;

  const provider = getAIProvider();
  const registry = getToolRegistry();
  const toolDefinitions = toAIToolDefinitions(registry.list());

  const messages: AIMessage[] = [
    { role: 'system', content: systemPrompt },
    ...orderedHistory.map(toAIMessage),
  ];

  const firstResponse = await provider.generateResponse({ messages, tools: toolDefinitions });

  const toolCallResults: ToolCallDTO[] = [];
  const pendingApprovalIds: string[] = [];
  let finalContent = firstResponse.content;

  if (firstResponse.toolCalls.length > 0) {
    const toolResultMessages: AIMessage[] = [];

    for (const call of firstResponse.toolCalls) {
      const outcome = await executeToolCall(call.name, call.arguments, {
        userId: input.userId,
        conversationId: conversation._id.toString(),
        timezone: user.timezone,
        isApprovedExecution: false,
      });

      if (outcome.status === 'awaiting_approval' && outcome.approvalId) {
        pendingApprovalIds.push(outcome.approvalId);
      }

      toolCallResults.push({
        toolName: call.name,
        input: call.arguments,
        status: outcome.status,
        result: outcome.result?.data,
        approvalId: outcome.approvalId,
      });

      toolResultMessages.push({
        role: 'tool',
        name: call.name,
        toolCallId: call.id,
        content: JSON.stringify(outcome.result ?? { success: false, message: 'No result' }),
      });

      await logActivity(input.userId, {
        action: 'agent.tool_call',
        category: 'agent',
        description: `Agent called ${call.name}: ${outcome.result?.message ?? outcome.status}`,
      });
    }

    const synthesis = await provider.generateResponse({
      messages: [
        ...messages,
        {
          role: 'assistant',
          content: firstResponse.content,
          toolCalls: firstResponse.toolCalls,
        },
        ...toolResultMessages,
      ],
      tools: toolDefinitions,
    });
    finalContent = synthesis.content || firstResponse.content || 'Done.';
  }

  if (!finalContent) {
    finalContent = "I'm not sure how to help with that yet. Could you rephrase?";
  }

  const assistantMessageDoc = await MessageModel.create({
    conversationId: conversation._id,
    userId: input.userId,
    role: 'assistant',
    content: finalContent,
    toolCalls: toolCallResults,
  });
  await touchConversation(conversation._id.toString(), finalContent);

  await logActivity(input.userId, {
    action: 'agent.message_processed',
    category: 'agent',
    description: `Processed ${input.source} message in conversation ${conversation._id.toString()}`,
  });

  return {
    conversationId: conversation._id.toString(),
    userMessage: toMessageDTO(userMessageDoc),
    assistantMessage: toMessageDTO(assistantMessageDoc),
    pendingApprovalIds,
  };
}

function toAIMessage(doc: InstanceType<typeof MessageModel>): AIMessage {
  return {
    role: doc.role as AIMessage['role'],
    content: doc.content,
  };
}
