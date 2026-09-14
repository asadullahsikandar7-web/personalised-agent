import { z } from 'zod';
import { defineTool } from '../types';

export const sendMessageTool = defineTool({
  name: 'send_message',
  description: 'Send a message on the user\'s behalf. Always requires explicit approval before sending.',
  inputSchema: z.object({ recipient: z.string().trim().min(1).max(200).optional(), body: z.string().trim().min(1).max(2000) }),
  permissionLevel: 'approval_required',
  describeAction: (input) => `Send message${input.recipient ? ` to ${input.recipient}` : ''}: "${input.body.slice(0, 80)}${input.body.length > 80 ? '…' : ''}"`,
  async execute(input) {
    // No outbound messaging provider (email/SMS/chat) is configured in this build. Rather than
    // faking delivery, we are explicit that approval succeeded but sending is not wired up yet -
    // see docs/known-platform-limitations.md.
    return {
      success: false,
      message: 'Approved, but no message-sending provider (email/SMS/chat) is configured on this server yet, so nothing was actually sent.',
      errorCode: 'NOT_CONFIGURED',
      data: { recipient: input.recipient ?? null, body: input.body },
    };
  },
});
