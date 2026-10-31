import fastify, { type FastifyInstance } from 'fastify';
import type { EnvConfig } from '../../config/env.ts';
import { healthRoutes } from './routes/health.ts';
import { chatCompletionsRoutes } from './routes/chat-completions.ts';
import { SqliteRepository } from '../database/sqlite-repository.ts';
import { OpenRouterClient } from '../providers/openrouter-client.ts';

import { ObservabilityDispatcher } from '../observability/observability-dispatcher.ts';
import { LangfuseAdapter } from '../observability/langfuse-adapter.ts';

export interface ServerDependencies {
  db?: SqliteRepository;
  client?: OpenRouterClient;
  observability?: ObservabilityDispatcher;
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

  const observability =
    dependencies.observability ??
    (() => {
      const dispatcher = new ObservabilityDispatcher();
      if (config.LANGFUSE_PUBLIC_KEY && config.LANGFUSE_SECRET_KEY) {
        dispatcher.registerAdapter(
          new LangfuseAdapter({
            publicKey: config.LANGFUSE_PUBLIC_KEY,
            secretKey: config.LANGFUSE_SECRET_KEY,
            baseUrl: config.LANGFUSE_BASEURL,
          })
        );
      }
      return dispatcher;
    })();

  app.addHook('onClose', async () => {
    db.close();
  });

  await app.register(healthRoutes, { config });
  await app.register(chatCompletionsRoutes, {
    db,
    client,
    observability,
    defaultStrategy: config.DEFAULT_ROUTING_STRATEGY,
  });

  return app;
}
