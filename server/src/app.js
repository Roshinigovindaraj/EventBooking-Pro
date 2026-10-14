import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { env } from './config/env.js';
import authRoutes from './routes/authRoutes.js';
import catalogRoutes from './routes/catalogRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';
import managementRoutes from './routes/managementRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import staffRoutes from './routes/staffRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true, methods: ['GET', 'POST', 'PATCH', 'DELETE'] }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use('/api/v1/auth', rateLimit({ windowMs: 15 * 60_000, limit: 50, standardHeaders: 'draft-7', legacyHeaders: false }), authRoutes);
app.get('/api/v1/health', (_req, res) => res.json({ status: 'ok', service: 'eventoria-api' }));
app.use('/api/v1', catalogRoutes, customerRoutes, applicationRoutes, managementRoutes, adminRoutes, paymentRoutes, staffRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

