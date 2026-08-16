import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import authRouter from './features/auth/auth.routes.js';
import userRouter from './features/users/user.routes.js';
import gameRouter from './features/games/game.routes.js';
import commentaryRouter from './features/commentary/commentary.routes.js';
import { notFound, errorHandler } from './middleware/error.middleware.js';

export function createApp() {
  const app = express();

  // Rate limiters key off req.ip, which is only trustworthy behind a proxy when
  // Express is told so explicitly.
  if (env.trustProxy) app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.corsOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.get('/health', (req, res) => {
    const dbConnected = mongoose.connection.readyState === 1;
    res.status(dbConnected ? 200 : 503).json({ status: dbConnected ? 'ok' : 'degraded', db: dbConnected });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/users', userRouter);
  app.use('/api/games', gameRouter);
  app.use('/api/commentary', commentaryRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
