import type { FastifyInstance } from 'fastify';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@personal-agent/shared';
import { parseOrThrow } from '../../middleware/validate';
import { getUserId } from '../../middleware/current-user';
import { sendSuccess } from '../../utils/response';
import { isProduction } from '../../config/env';
import * as authService from './service';
import { getUserOrThrow } from '../users/service';
import { logActivity } from '../activity/service';

export default async function authRoutes(app: FastifyInstance) {
  app.post('/register', async (req, reply) => {
    const input = parseOrThrow(registerSchema, req.body);
    const user = await authService.registerUser(input);
    const tokens = await authService.issueTokenPair(app, user, req.headers['user-agent'] ?? 'unknown', req.ip);
    sendSuccess(reply, { user: authService.toPublicUser(user), ...tokens }, 201);
  });

  app.post('/login', async (req, reply) => {
    const input = parseOrThrow(loginSchema, req.body);
    const user = await authService.validateCredentials(input);
    const tokens = await authService.issueTokenPair(app, user, req.headers['user-agent'] ?? 'unknown', req.ip);
    await logActivity(user._id.toString(), { action: 'auth.login', category: 'auth', description: 'User logged in' });
    sendSuccess(reply, { user: authService.toPublicUser(user), ...tokens });
  });

  app.post('/refresh', async (req, reply) => {
    const input = parseOrThrow(refreshSchema, req.body);
    const result = await authService.rotateRefreshToken(app, input.refreshToken, req.headers['user-agent'] ?? 'unknown', req.ip);
    sendSuccess(reply, {
      user: authService.toPublicUser(result.user),
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  });

  app.post('/logout', async (req, reply) => {
    const input = parseOrThrow(refreshSchema, req.body);
    await authService.revokeRefreshToken(input.refreshToken);
    sendSuccess(reply, { loggedOut: true });
  });

  app.get('/me', { preHandler: app.authenticate }, async (req, reply) => {
    const userId = getUserId(req);
    const user = await getUserOrThrow(userId);
    sendSuccess(reply, authService.toPublicUser(user));
  });

  app.post('/forgot-password', async (req, reply) => {
    const input = parseOrThrow(forgotPasswordSchema, req.body);
    const token = await authService.createPasswordResetToken(input.email);
    // Always respond the same way regardless of whether the email exists, to avoid user enumeration.
    sendSuccess(reply, {
      message: 'If an account with that email exists, a password reset link has been sent.',
      // Dev-only convenience: return the raw token so local testing does not require email delivery.
      devResetToken: !isProduction ? token : undefined,
    });
  });

  app.post('/reset-password', async (req, reply) => {
    const input = parseOrThrow(resetPasswordSchema, req.body);
    await authService.resetPasswordWithToken(input.token, input.password);
    sendSuccess(reply, { message: 'Password has been reset. Please log in again.' });
  });
}
