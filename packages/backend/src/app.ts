import express from 'express';
import cors from 'cors';
import { config } from './config';
import { loggingMiddleware } from './middleware/logging';
import { queryRouter } from './routes/query';
import { verifyLmStudioConnection } from './llm/client';

export function createApp() {
  const app = express();

  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json());
  app.use(loggingMiddleware());

  app.get('/health', (_req, res) => {
    res.json({ ok: true, data: { status: 'up' } });
  });

  app.get('/health/llm', async (_req, res) => {
    const result = await verifyLmStudioConnection();
    res.status(result.ok ? 200 : 503).json({ ok: result.ok, data: { message: result.message } });
  });

  app.use('/api', queryRouter);

  app.use((_req, res) => {
    res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Route not found.' } });
  });

  return app;
}
