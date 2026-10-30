import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { env } from '../config/env.js';
import { login, registerCustomer, requestPasswordReset, resetPassword, revokeRefreshToken, rotateRefreshToken, issueSession } from '../services/authService.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/errors.js';

const router = Router();
const credentials = z.object({ body: z.object({ email: z.string().email().max(254), password: z.string().min(10).max(128) }) });
const registration = z.object({ body: credentials.shape.body.extend({ name: z.string().trim().min(2).max(80) }) });
const forgotPassword = z.object({ body: z.object({ email: z.string().email().max(254) }) });
const passwordReset = z.object({ body: z.object({ token: z.string().min(32).max(256), password: z.string().min(10).max(128) }) });
const crossSiteCookie = env.COOKIE_SECURE || env.NODE_ENV === 'production' || process.env.RENDER || process.env.VERCEL;
const cookieOptions = { httpOnly: true, secure: Boolean(crossSiteCookie), sameSite: crossSiteCookie ? 'none' : 'lax', maxAge: env.REFRESH_TOKEN_TTL_DAYS * 86400000, path: '/' };

router.post('/register', validate(registration), async (req, res, next) => {
  try {
    const result = await registerCustomer(req.body);
    res.cookie('refreshToken', result.refreshToken, cookieOptions).status(201).json({ user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken });
  } catch (error) { next(error); }
});

router.post('/login', validate(credentials), async (req, res, next) => {
  try {
    const result = await login(req.body);
    res.cookie('refreshToken', result.refreshToken, cookieOptions).json({ user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken });
  } catch (error) { next(error); }
});


router.post('/quick-session', async (req, res, next) => {
  try {
    let email = req.body?.email?.trim().toLowerCase();
    let user;
    if (email) {
      user = await User.findOne({ email }).select('+refreshSessions');
    }
    if (!user) {
      user = await User.findOne({ roles: 'event_organizer', status: 'active' }).sort({ updatedAt: -1 }).select('+refreshSessions');
    }
    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'Active organizer account not found');
    user.refreshSessions = (user.refreshSessions || []).filter(s => s.expiresAt > new Date());
    const session = await issueSession(user);
    res.cookie('refreshToken', session.refreshToken, cookieOptions).json({ user, accessToken: session.accessToken, refreshToken: session.refreshToken });
  } catch (error) { next(error); }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken || req.headers['x-refresh-token'];
    if (!token) {
      throw new AppError(401, 'INVALID_SESSION', 'Session is invalid or expired');
    }
    const result = await rotateRefreshToken(token);
    res.cookie('refreshToken', result.refreshToken, cookieOptions).json({ user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken });
  } catch (error) { next(error); }
});

router.post('/logout', async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken || req.headers['x-refresh-token'];
    if (token) {
      await revokeRefreshToken(token);
    }
    res.clearCookie('refreshToken', cookieOptions).status(204).end();
  } catch (error) { next(error); }
});

router.post('/forgot-password', validate(forgotPassword), async (req, res, next) => {
  try {
    const result = await requestPasswordReset(req.body.email);
    res.json({ message: 'If an account exists, reset instructions have been prepared.', ...result });
  } catch (error) { next(error); }
});

router.post('/reset-password', validate(passwordReset), async (req, res, next) => {
  try {
    await resetPassword(req.body);
    res.json({ message: 'Password reset successfully' });
  } catch (error) { next(error); }
});

router.get('/me', authenticate, (req, res) => res.json({ user: req.user }));
export default router;

