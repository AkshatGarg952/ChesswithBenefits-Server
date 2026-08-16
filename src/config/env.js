import 'dotenv/config';
import { logger } from '../utils/logger.js';

const REQUIRED_VARS = ['MONGODB_URI', 'JWT_SECRET'];

const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
if (missing.length > 0) {
  logger.error(`Missing required environment variable(s): ${missing.join(', ')}`);
  process.exit(1);
}

const DEFAULT_CORS_ORIGINS = [
  'https://chesswith-benefits-client.vercel.app',
  'https://chesswith-benefits-client-n3o3203ct.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

const parseOrigins = (value) =>
  value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

export const env = {
  port: Number(process.env.PORT_NO) || 3000,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  geminiApiKey: process.env.GEMINI_API_KEY,
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  corsOrigins: process.env.CORS_ORIGIN ? parseOrigins(process.env.CORS_ORIGIN) : DEFAULT_CORS_ORIGINS,
  stockfish: {
    depth: Number(process.env.STOCKFISH_DEPTH) || 12,
    timeoutMs: Number(process.env.STOCKFISH_TIMEOUT_MS) || 8000,
  },
  // Enable only when the app really sits behind a proxy/load balancer (Render,
  // Railway, nginx, …). Enabling it otherwise lets clients spoof their IP and
  // walk straight through the rate limiters.
  trustProxy: process.env.TRUST_PROXY === 'true',
};

if (!env.geminiApiKey) {
  logger.warn('[env] GEMINI_API_KEY not set — AI commentary endpoint will error until configured.');
}
if (!env.cloudinary.cloudName || !env.cloudinary.apiKey || !env.cloudinary.apiSecret) {
  logger.warn('[env] Cloudinary credentials incomplete — profile image uploads will fail until configured.');
}
