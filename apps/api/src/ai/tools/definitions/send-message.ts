import { z } from 'zod';
import { defineTool } from '../types';
import { isEmailConfigured, sendEmail } from '../../../modules/notifications/email';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const sendMessageTool = defineTool({
  name: 'send_message',
  description: 'Send a message on the user\'s behalf. Always requires explicit approval before sending.',
  inputSchema: z.object({ recipient: z.string().trim().min(1).max(200).optional(), body: z.string().trim().min(1).max(2000) }),
  permissionLevel: 'approval_required',
  describeAction: (input) => `Send message${input.recipient ? ` to ${input.recipient}` : ''}: "${input.body.slice(0, 80)}${input.body.length > 80 ? '…' : ''}"`,
  async execute(input) {
    // Only email delivery (via Resend) is wired up; SMS/chat still have no provider configured
    // in this build. Rather than faking delivery, we are explicit whenever sending didn't
    // actually happen - see docs/known-platform-limitations.md.
    if (!input.recipient || !EMAIL_PATTERN.test(input.recipient)) {
      return {
        success: false,
        message: 'Approved, but the recipient is not an email address and no SMS/chat provider is configured on this server, so nothing was actually sent.',
        errorCode: 'NOT_CONFIGURED',
        data: { recipient: input.recipient ?? null, body: input.body },
      };
    }

    if (!isEmailConfigured()) {
      return {
        success: false,
        message: 'Approved, but no email provider is configured on this server yet, so nothing was actually sent.',
        errorCode: 'NOT_CONFIGURED',
        data: { recipient: input.recipient, body: input.body },
      };
    }

    const delivered = await sendEmail(input.recipient, 'Message from your Personal Agent', `<p>${input.body}</p>`);
    return {
      success: delivered,
      message: delivered
        ? `Email sent to ${input.recipient}.`
        : `Approved, but the email provider failed to deliver to ${input.recipient}.`,
      errorCode: delivered ? undefined : 'PROVIDER_ERROR',
      data: { recipient: input.recipient, body: input.body },
    };
  },
});
