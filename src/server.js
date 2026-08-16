import { createServer } from 'http';
import { Server } from 'socket.io';
import { createApp } from './app.js';
import { env } from './config/env.js';
import connectDB from './database/mongoose.js';
import { registerSocketHandlers } from './sockets/index.js';
import { logger } from './utils/logger.js';

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

async function start() {
  // Connect to the database before accepting any traffic, so the server never
  // serves requests against a connection that failed to establish.
  await connectDB();

  const app = createApp();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: env.corsOrigins,
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });

  registerSocketHandlers(io);

  httpServer.listen(env.port, () => {
    logger.info(`Server listening on port ${env.port}`);
  });
}

start();
