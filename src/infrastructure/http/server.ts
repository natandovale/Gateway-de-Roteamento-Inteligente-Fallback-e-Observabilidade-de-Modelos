import fastify, { type FastifyInstance } from 'fastify';
import type { EnvConfig } from '../../config/env.ts';
import { healthRoutes } from './routes/health.ts';
import { chatCompletionsRoutes } from './routes/chat-completions.ts';
import { SqliteRepository } from '../database/sqlite-repository.ts';
import { OpenRouterClient } from '../providers/openrouter-client.ts';

export interface ServerDependencies {
  db?: SqliteRepository;
  client?: OpenRouterClient;
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

  const client =
    dependencies.client ??
    new OpenRouterClient({
      apiKey: config.OPENROUTER_API_KEY,
      baseUrl: config.OPENROUTER_BASE_URL,
      timeoutMs: config.REQUEST_TIMEOUT_MS,
    });

  app.addHook('onClose', async () => {
    db.close();
  });

  await app.register(healthRoutes, { config });
  await app.register(chatCompletionsRoutes, {
    db,
    client,
    defaultStrategy: config.DEFAULT_ROUTING_STRATEGY,
  });

  return app;
}
