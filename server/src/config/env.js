import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().min(1),
  MONGODB_DNS_SERVERS: z.string().optional().transform(value => value ? value.split(',').map(item => item.trim()).filter(Boolean) : []),
  CLIENT_URL: z.string().url(),
  ACCESS_TOKEN_SECRET: z.string().min(32),
  REFRESH_TOKEN_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  COOKIE_SECURE: z.enum(['true', 'false']).default('false').transform(v => v === 'true'),
  PAYMENT_MODE: z.enum(['mock', 'provider']).default('mock'),
  PAYMENT_WEBHOOK_SECRET: z.string().min(16),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const message = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
  throw new Error(`Invalid environment configuration: ${message}`);
}

export const env = parsed.data;

