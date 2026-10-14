import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';

const digest = value => crypto.createHash('sha256').update(value).digest('hex');

function signAccessToken(user) {
  return jwt.sign({ sub: user.id, roles: user.roles }, env.ACCESS_TOKEN_SECRET, { expiresIn: env.ACCESS_TOKEN_TTL, issuer: 'eventoria-api', audience: 'eventoria-web' });
}

function signRefreshToken(user, sessionId) {
  return jwt.sign({ sub: user.id, sid: sessionId }, env.REFRESH_TOKEN_SECRET, { expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d`, issuer: 'eventoria-api', audience: 'eventoria-web' });
}

async function issueSession(user) {
  const sessionId = crypto.randomUUID();
  const refreshToken = signRefreshToken(user, sessionId);
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86400000);
  user.refreshSessions.push({ _id: sessionId, tokenHash: digest(refreshToken), expiresAt });
  await user.save();
  return { accessToken: signAccessToken(user), refreshToken };
}

export async function registerCustomer(input) {
  if (await User.exists({ email: input.email.toLowerCase() })) throw new AppError(409, 'EMAIL_EXISTS', 'An account already exists for that email');
  const user = new User({ name: input.name, email: input.email, passwordHash: await bcrypt.hash(input.password, 12), roles: ['customer'] });
  return { user, ...(await issueSession(user)) };
}

export async function login(input) {
  const user = await User.findOne({ email: input.email.toLowerCase() }).select('+passwordHash +refreshSessions');
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
  if (user.status !== 'active') throw new AppError(403, 'ACCOUNT_SUSPENDED', 'This account is suspended');
  user.refreshSessions = user.refreshSessions.filter(s => s.expiresAt > new Date());
  return { user, ...(await issueSession(user)) };
}

export async function rotateRefreshToken(refreshToken) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, env.REFRESH_TOKEN_SECRET, { issuer: 'eventoria-api', audience: 'eventoria-web' });
  } catch {
    throw new AppError(401, 'INVALID_SESSION', 'Session is invalid or expired');
  }
  const user = await User.findById(payload.sub).select('+refreshSessions');
  const session = user?.refreshSessions.id(payload.sid);
  if (!session || session.tokenHash !== digest(refreshToken) || session.expiresAt <= new Date()) throw new AppError(401, 'INVALID_SESSION', 'Session is invalid or expired');
  session.deleteOne();
  return { user, ...(await issueSession(user)) };
}

export async function revokeRefreshToken(refreshToken) {
  try {
    const payload = jwt.verify(refreshToken, env.REFRESH_TOKEN_SECRET, { issuer: 'eventoria-api', audience: 'eventoria-web' });
    await User.updateOne({ _id: payload.sub }, { $pull: { refreshSessions: { _id: payload.sid } } });
  } catch {
    // Logout is deliberately idempotent.
  }
}

export async function requestPasswordReset(email) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordResetTokenHash +passwordResetExpiresAt');
  if (!user) return {};
  const resetToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetTokenHash = digest(resetToken);
  user.passwordResetExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await user.save();
  return env.NODE_ENV === 'production' ? {} : { resetToken };
}

export async function resetPassword({ token, password }) {
  const user = await User.findOne({
    passwordResetTokenHash: digest(token),
    passwordResetExpiresAt: { $gt: new Date() },
  }).select('+passwordHash +passwordResetTokenHash +passwordResetExpiresAt +refreshSessions');
  if (!user) throw new AppError(400, 'INVALID_RESET_TOKEN', 'Reset link is invalid or has expired');
  user.passwordHash = await bcrypt.hash(password, 12);
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpiresAt = undefined;
  user.refreshSessions = [];
  await user.save();
}

export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, env.ACCESS_TOKEN_SECRET, { issuer: 'eventoria-api', audience: 'eventoria-web' });
  } catch {
    throw new AppError(401, 'INVALID_ACCESS_TOKEN', 'Authentication is required');
  }
}

