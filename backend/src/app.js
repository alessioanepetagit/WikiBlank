import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';
import { authRouter } from './routes/authRoutes.js';
import { gameRouter } from './routes/gameRoutes.js';
import { rankingRouter } from './routes/rankingRoutes.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');

  app.use(helmet());
  // CORS: solo le origini del frontend configurate (non "*")
  app.use(cors({ origin: config.allowedOrigins, exposedHeaders: ['Location'] }));
  if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));
  app.use(express.json({ limit: '10kb' }));

  app.use(authRouter);
  app.use(gameRouter);
  app.use(rankingRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
