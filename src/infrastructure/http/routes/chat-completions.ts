import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { chatCompletionRequestSchema } from '../schemas/chat-completions.ts';
import type { SqliteRepository } from '../../database/sqlite-repository.ts';
import type { OpenRouterClient } from '../../providers/openrouter-client.ts';
import { ExecutionService } from '../../../services/execution-service.ts';
import { RoutePlanner } from '../../../core/strategies/route-planner.ts';
import type { ModelCandidate, RoutingStrategyType } from '../../../core/entities/model-candidate.ts';

export interface ChatCompletionsRouteOptions {
  db: SqliteRepository;
  client: OpenRouterClient;
  defaultStrategy: RoutingStrategyType;
}

export const chatCompletionsRoutes: FastifyPluginAsync<ChatCompletionsRouteOptions> = async (
  fastify: FastifyInstance,
  opts: ChatCompletionsRouteOptions
) => {
  const executionService = new ExecutionService({
    client: opts.client,
    repository: opts.db,
  });

  const routePlanner = new RoutePlanner();

  fastify.post('/v1/chat/completions', async (request, reply) => {
    // 1. Validação do schema OpenAI com Zod
    const validation = chatCompletionRequestSchema.safeParse(request.body);

    if (!validation.success) {
      const issue = validation.error.issues[0];
      return reply.status(400).send({
        error: {
          message: issue ? `[${issue.path.join('.')}]: ${issue.message}` : 'Payload inválido',
          type: 'invalid_request_error',
          code: 400,
        },
      });
    }

    const { model, messages, temperature, max_tokens } = validation.data;

    // 2. Extração da estratégia de roteamento (header x-routing-strategy ou default)
    const rawStrategy = (request.headers['x-routing-strategy'] as string | undefined)?.toLowerCase();
    const strategy: RoutingStrategyType =
      rawStrategy === 'price' || rawStrategy === 'latency' || rawStrategy === 'throughput'
        ? rawStrategy
        : opts.defaultStrategy;

    // 3. Obtenção dos candidatos a partir do cache e métricas do SQLite
    let cachedModels = opts.db.getCachedModels();

    const defaultCatalog = [
      {
        id: 'meta-llama/llama-3.1-8b-instruct',
        name: 'Llama 3.1 8B Instruct',
        promptPricePerMillion: 0.05,
        completionPricePerMillion: 0.08,
        contextLength: 131072,
      },
      {
        id: 'openai/gpt-4o-mini',
        name: 'GPT-4o Mini',
        promptPricePerMillion: 0.15,
        completionPricePerMillion: 0.60,
        contextLength: 128000,
      },
      {
        id: 'deepseek/deepseek-chat',
        name: 'DeepSeek V3',
        promptPricePerMillion: 0.14,
        completionPricePerMillion: 0.28,
        contextLength: 64000,
      },
      {
        id: 'qwen/qwen-2.5-72b-instruct',
        name: 'Qwen 2.5 72B Instruct',
        promptPricePerMillion: 0.35,
        completionPricePerMillion: 0.40,
        contextLength: 32768,
      },
    ];

    // Se o banco ainda não tiver modelos populados, inicializa com modelos confiáveis do OpenRouter
    if (cachedModels.length === 0) {
      opts.db.saveModelsCache(defaultCatalog);
      cachedModels = opts.db.getCachedModels();
    }

    let candidates: ModelCandidate[] = cachedModels.map((m: any) => {
      const summary = opts.db.getModelPerformanceSummary(m.id);
      return {
        id: m.id,
        name: m.name,
        promptPricePerMillion: m.prompt_price_per_million,
        completionPricePerMillion: m.completion_price_per_million,
        contextLength: m.context_length,
        avgLatencyMs: summary?.avg_latency_ms,
        avgThroughputTps: summary?.avg_throughput_tps,
      };
    });

    // 4. Criação do plano de rota
    const isDynamicModel = model.startsWith('gateway/auto-') || model === 'default';
    const plan = routePlanner.createPlan({
      strategy,
      requestedModelId: isDynamicModel ? undefined : model,
      candidates,
    });

    // 5. Execução com fallback automático
    try {
      const result = await executionService.execute({
        plan,
        messages,
        temperature,
        max_tokens,
      });

      // 6. Headers analíticos exclusivos do Gateway
      reply.header('x-gateway-strategy', result.strategy);
      reply.header('x-gateway-model-requested', plan.primaryModel.id);
      reply.header('x-gateway-model-executed', result.executedModelId);
      reply.header('x-gateway-fallback-triggered', String(result.fallbackTriggered));
      reply.header('x-gateway-fallback-attempts', String(result.fallbackAttempts));
      reply.header('x-gateway-cost-usd', result.costUsd.toFixed(6));
      reply.header('x-gateway-latency-ms', String(result.latencyMs));

      return reply.status(200).send(result.response);
    } catch (error: any) {
      const statusCode = error.statusCode ?? 500;
      return reply.status(statusCode).send({
        error: {
          message: error.message ?? 'Falha ao executar chat completion',
          type: 'gateway_error',
          code: statusCode,
        },
      });
    }
  });
};
