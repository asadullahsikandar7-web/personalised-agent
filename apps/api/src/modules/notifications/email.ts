import { env } from '../../config/env';
import { logger } from '../../utils/logger';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export function isEmailConfigured(): boolean {
  return Boolean(env.RESEND_API_KEY);
}

/**
 * Sends an email through Resend. Returns false (and logs) on failure rather than throwing -
 * email delivery must never be able to fail the request that triggered it (e.g. forgot-password,
 * which always responds the same way regardless of delivery outcome to avoid user enumeration).
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!isEmailConfigured()) return false;

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: env.EMAIL_FROM, to, subject, html }),
    });

    if (!res.ok) {
      const body = await res.text();
      logger.error({ status: res.status, body }, 'Resend email send failed');
      return false;
    }
    return true;
  } catch (err) {
    logger.error({ err }, 'Resend email send threw');
    return false;
  }
}
