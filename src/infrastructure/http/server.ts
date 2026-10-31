import fastify, { type FastifyInstance } from 'fastify';
import type { EnvConfig } from '../../config/env.ts';
import { healthRoutes } from './routes/health.ts';
import { SqliteRepository } from '../database/sqlite-repository.ts';

export interface ServerDependencies {
  db?: SqliteRepository;
}

export async function buildServer(
  config: EnvConfig,
  dependencies: ServerDependencies = {}
): Promise<FastifyInstance> {
  const app = fastify({
    logger: config.NODE_ENV !== 'test',
  });

  const db = dependencies.db ?? new SqliteRepository(config.DATABASE_PATH);
  db.init();

  app.addHook('onClose', async () => {
    db.close();
  });

  await app.register(healthRoutes, { config });

  return app;
}
