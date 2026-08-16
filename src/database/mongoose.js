import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

async function connectDB() {
  try {
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 8000 });
    logger.info('MongoDB connected');
  } catch (error) {
    logger.error('Database connection error:', error.message);
    process.exit(1);
  }
}

export default connectDB;
