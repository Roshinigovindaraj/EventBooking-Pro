import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';

let app;
beforeAll(async () => {
  Object.assign(process.env, {
    NODE_ENV: 'test',
    MONGODB_URI: 'mongodb://127.0.0.1:27017/eventoria-test',
    CLIENT_URL: 'http://localhost:5173',
    ACCESS_TOKEN_SECRET: 'test-access-secret-at-least-32-characters',
    REFRESH_TOKEN_SECRET: 'test-refresh-secret-at-least-32-characters',
    PAYMENT_WEBHOOK_SECRET: 'test-webhook-secret-value',
  });
  ({ app } = await import('../src/app.js'));
});

describe('API foundation', () => {
  it('reports service health', async () => {
    const response = await request(app).get('/api/v1/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', service: 'eventoria-api' });
  });

  it('returns the structured event category catalog', async () => {
    const response = await request(app).get('/api/v1/categories');
    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(8);
    expect(response.body.items.find(item => item.name === 'Entertainment').subcategories).toContain('Music');
    expect(response.body.items.find(item => item.name === 'Food & Lifestyle').subcategories).toContain('Cooking workshops');
  });

  it('rejects unauthenticated protected requests', async () => {
    const response = await request(app).get('/api/v1/users/me');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_REQUIRED');
  });

  it('uses a structured response for unknown routes', async () => {
    const response = await request(app).get('/api/v1/not-a-route');
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('ROUTE_NOT_FOUND');
  });
});

