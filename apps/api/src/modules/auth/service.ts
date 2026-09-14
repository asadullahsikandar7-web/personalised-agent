import { UserModel, RefreshTokenModel, UserPreferenceModel, type UserDoc } from '../../db/models';
import type { AccessTokenPayload } from '../../plugins/auth';
import { hashPassword, verifyPassword } from '../../utils/password';
import { generateOpaqueToken, hashToken } from '../../utils/jwt';
import { AppError } from '../../utils/errors';
import { env } from '../../config/env';
import { logActivity } from '../activity/service';
import ms from '../../utils/ms';
import type { RegisterInput, LoginInput, PublicUser } from '@personal-agent/shared';

export function toPublicUser(user: UserDoc): PublicUser {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    timezone: user.timezone,
    createdAt: user.createdAt.toISOString(),
  };
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export async function registerUser(input: RegisterInput): Promise<UserDoc> {
  const existing = await UserModel.findOne({ email: input.email });
  if (existing) {
    throw AppError.conflict('An account with this email already exists');
  }
  const passwordHash = await hashPassword(input.password);
  const user = await UserModel.create({ email: input.email, passwordHash, name: input.name });
  await UserPreferenceModel.create({ userId: user._id });
  await logActivity(user._id.toString(), { action: 'auth.register', category: 'auth', description: 'Account created' });
  return user;
}

export async function validateCredentials(input: LoginInput): Promise<UserDoc> {
  const user = await UserModel.findOne({ email: input.email }).select('+passwordHash');
  if (!user || !user.isActive) {
    throw AppError.unauthorized('Invalid email or password');
  }
  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    throw AppError.unauthorized('Invalid email or password');
  }
  return user;
}

async function issueRefreshToken(userId: string, deviceInfo: string, ipAddress?: string): Promise<string> {
  const token = generateOpaqueToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + ms(env.JWT_REFRESH_EXPIRES_IN));
  await RefreshTokenModel.create({ userId, tokenHash, deviceInfo, ipAddress, expiresAt });
  return token;
}

export async function issueTokenPair(
  app: { jwt: { sign: (payload: AccessTokenPayload) => string } },
  user: UserDoc,
  deviceInfo = 'unknown',
  ipAddress?: string,
): Promise<TokenPair> {
  const accessToken = app.jwt.sign({ sub: user._id.toString(), email: user.email });
  const refreshToken = await issueRefreshToken(user._id.toString(), deviceInfo, ipAddress);
  return { accessToken, refreshToken };
}

/** Rotates a refresh token: validates it, revokes it, and issues a brand new pair. */
export async function rotateRefreshToken(
  app: { jwt: { sign: (payload: AccessTokenPayload) => string } },
  refreshToken: string,
  deviceInfo = 'unknown',
  ipAddress?: string,
): Promise<TokenPair & { user: UserDoc }> {
  const tokenHash = hashToken(refreshToken);
  const existing = await RefreshTokenModel.findOne({ tokenHash });

  if (!existing || existing.revokedAt || existing.expiresAt.getTime() < Date.now()) {
    throw AppError.unauthorized('Refresh token is invalid or has expired');
  }

  const user = await UserModel.findById(existing.userId);
  if (!user || !user.isActive) {
    throw AppError.unauthorized('Account is no longer active');
  }

  const newRefreshToken = await issueRefreshToken(user._id.toString(), deviceInfo, ipAddress);
  existing.revokedAt = new Date();
  existing.replacedByTokenHash = hashToken(newRefreshToken);
  await existing.save();

  const accessToken = app.jwt.sign({ sub: user._id.toString(), email: user.email });
  return { accessToken, refreshToken: newRefreshToken, user };
}

export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  const tokenHash = hashToken(refreshToken);
  await RefreshTokenModel.updateOne({ tokenHash }, { revokedAt: new Date() });
}

export async function revokeAllSessionsForUser(userId: string): Promise<void> {
  await RefreshTokenModel.updateMany({ userId, revokedAt: null }, { revokedAt: new Date() });
}

/**
 * Password reset "foundation": issues a short-lived reset token hash stored on the user record.
 * Delivering the token to the user (email) is out of scope for local dev - the token is
 * returned to the caller only in non-production environments for testing. See docs/setup.md.
 */
export async function createPasswordResetToken(email: string): Promise<string | null> {
  const user = await UserModel.findOne({ email });
  if (!user) return null; // Do not reveal whether the email exists.
  const token = generateOpaqueToken();
  user.passwordResetTokenHash = hashToken(token);
  user.passwordResetExpiresAt = new Date(Date.now() + 30 * 60_000);
  await user.save();
  return token;
}

export async function resetPasswordWithToken(token: string, newPassword: string): Promise<void> {
  const tokenHash = hashToken(token);
  const user = await UserModel.findOne({ passwordResetTokenHash: tokenHash }).select(
    '+passwordResetTokenHash +passwordResetExpiresAt',
  );
  if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt.getTime() < Date.now()) {
    throw AppError.validation('Reset token is invalid or has expired');
  }
  user.passwordHash = await hashPassword(newPassword);
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpiresAt = undefined;
  await user.save();
  await revokeAllSessionsForUser(user._id.toString());
}
