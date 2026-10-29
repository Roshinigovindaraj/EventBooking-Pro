import { connectDatabase, disconnectDatabase } from '../config/database.js';

// No automated seeds; user-created catalog only
try {
  await connectDatabase();
  console.log('Database connected. No demo data seeded.');
} catch (error) {
  console.error('Database connection error:', error);
} finally {
  await disconnectDatabase();
}
