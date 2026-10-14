import { app } from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';

async function start() {
  await connectDatabase();
  const server = app.listen(env.PORT, () => console.log(`Eventoria API listening on port ${env.PORT}`));
  const shutdown = signal => server.close(async () => { const { disconnectDatabase } = await import('./config/database.js'); await disconnectDatabase(); console.log(`${signal}: server stopped`); process.exit(0); });
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch(error => { console.error('Failed to start Eventoria API:', error.message); process.exit(1); });

