import mongoose from 'mongoose';
import dns from 'node:dns';
import { env } from './env.js';

export async function connectDatabase() {
  if (env.MONGODB_DNS_SERVERS.length) dns.setServers(env.MONGODB_DNS_SERVERS);
  mongoose.set('strictQuery', true);
  return mongoose.connect(env.MONGODB_URI);
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}

