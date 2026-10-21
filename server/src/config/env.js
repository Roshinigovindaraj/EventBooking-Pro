import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().min(1),
  MONGODB_DNS_SERVERS: z.string().optional().transform(value => value ? value.split(',').map(item => item.trim()).filter(Boolean) : []),
  CLIENT_URL: z.string().min(1).refine(
    value => value.split(',').every(origin => z.string().url().safeParse(origin.trim()).success),
    'CLIENT_URL must contain one or more comma-separated valid URLs',
  ),
  ACCESS_TOKEN_SECRET: z.string().min(32),
  REFRESH_TOKEN_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  COOKIE_SECURE: z.enum(['true', 'false']).default('false').transform(v => v === 'true'),
  PAYMENT_MODE: z.enum(['mock', 'provider']).default('mock'),
  PAYMENT_WEBHOOK_SECRET: z.string().min(16),
  RAZORPAY_KEY_ID: z.preprocess(value => typeof value === 'string' && value.trim() === '' ? undefined : value, z.string().trim().regex(/^rzp_(test|live)_[A-Za-z0-9]+$/).optional()),
  RAZORPAY_KEY_SECRET: z.preprocess(value => typeof value === 'string' && value.trim() === '' ? undefined : value, z.string().trim().min(20).optional()),
  CLOUDINARY_CLOUD_NAME: z.string().trim().min(1).optional(),
  CLOUDINARY_API_KEY: z.string().trim().min(1).optional(),
  CLOUDINARY_API_SECRET: z.string().trim().min(1).optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const message = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
  throw new Error(`Invalid environment configuration: ${message}`);
}

export const env = parsed.data;

if (env.PAYMENT_MODE === 'provider' && (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET)) {
  throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required when PAYMENT_MODE=provider');
}

