import fastify, { type FastifyInstance } from 'fastify';
import type { EnvConfig } from '../../config/env.ts';
import { healthRoutes } from './routes/health.ts';

export async function buildServer(config: EnvConfig): Promise<FastifyInstance> {
  const app = fastify({
    logger: config.NODE_ENV !== 'test',
  });

  await app.register(healthRoutes, { config });

  return app;
}
