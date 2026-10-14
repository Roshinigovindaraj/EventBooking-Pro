import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { env } from '../config/env.js';
import { login, registerCustomer, requestPasswordReset, resetPassword, revokeRefreshToken, rotateRefreshToken } from '../services/authService.js';

const router = Router();
const credentials = z.object({ body: z.object({ email: z.string().email().max(254), password: z.string().min(10).max(128) }) });
const registration = z.object({ body: credentials.shape.body.extend({ name: z.string().trim().min(2).max(80) }) });
const forgotPassword = z.object({ body: z.object({ email: z.string().email().max(254) }) });
const passwordReset = z.object({ body: z.object({ token: z.string().min(32).max(256), password: z.string().min(10).max(128) }) });
const cookieOptions = { httpOnly: true, secure: env.COOKIE_SECURE, sameSite: env.COOKIE_SECURE ? 'none' : 'lax', maxAge: env.REFRESH_TOKEN_TTL_DAYS * 86400000, path: '/api/v1/auth' };

router.post('/register', validate(registration), async (req, res, next) => {
  try {
    const result = await registerCustomer(req.body);
    res.cookie('refreshToken', result.refreshToken, cookieOptions).status(201).json({ user: result.user, accessToken: result.accessToken });
  } catch (error) { next(error); }
});

router.post('/login', validate(credentials), async (req, res, next) => {
  try {
    const result = await login(req.body);
    res.cookie('refreshToken', result.refreshToken, cookieOptions).json({ user: result.user, accessToken: result.accessToken });
  } catch (error) { next(error); }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const result = await rotateRefreshToken(req.cookies.refreshToken);
    res.cookie('refreshToken', result.refreshToken, cookieOptions).json({ user: result.user, accessToken: result.accessToken });
  } catch (error) { next(error); }
});

router.post('/logout', async (req, res, next) => {
  try {
    await revokeRefreshToken(req.cookies.refreshToken);
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

