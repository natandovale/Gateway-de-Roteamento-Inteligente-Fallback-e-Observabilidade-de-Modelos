import type { RoutePlan, ModelCandidate } from '../core/entities/model-candidate.ts';
import { calculateCostUsd } from '../core/entities/cost-calculator.ts';
import type { SqliteRepository } from '../infrastructure/database/sqlite-repository.ts';
import type { ObservabilityDispatcher } from '../infrastructure/observability/observability-dispatcher.ts';
import {
  OpenRouterClient,
  OpenRouterError,
  type ChatMessage,
  type ChatCompletionResponse,
} from '../infrastructure/providers/openrouter-client.ts';
import crypto from 'node:crypto';

export interface ExecuteParams {
  plan: RoutePlan;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
}

export interface ExecutionResult {
  requestId: string;
  response: ChatCompletionResponse;
  executedModelId: string;
  fallbackTriggered: boolean;
  fallbackAttempts: number;
  costUsd: number;
  latencyMs: number;
  strategy: string;
}

export interface ExecutionServiceDependencies {
  client: OpenRouterClient;
  repository: SqliteRepository;
  observability?: ObservabilityDispatcher;
}

export class ExecutionService {
  private client: OpenRouterClient;
  private repository: SqliteRepository;
  private observability?: ObservabilityDispatcher;

  constructor(dependencies: ExecutionServiceDependencies) {
    this.client = dependencies.client;
    this.repository = dependencies.repository;
    this.observability = dependencies.observability;
  }

  public async execute(params: ExecuteParams): Promise<ExecutionResult> {
    const { plan, messages, temperature, max_tokens } = params;
    const requestId = `req-${crypto.randomUUID()}`;

    // Fila ordenada de modelos: primário seguido da cadeia de fallback
    const modelsToTry: ModelCandidate[] = [plan.primaryModel, ...plan.fallbackChain];

    let lastError: Error | null = null;
    let fallbackAttempts = 0;

    for (let i = 0; i < modelsToTry.length; i++) {
      const candidate = modelsToTry[i];
      const isFallback = i > 0;
      const startTime = Date.now();

      try {
        const response = await this.client.createChatCompletion({
          model: candidate.id,
          messages,
          temperature,
          max_tokens,
        });

        const latencyMs = Date.now() - startTime;
        const promptTokens = response.usage?.prompt_tokens ?? 0;
        const completionTokens = response.usage?.completion_tokens ?? 0;
        const totalTokens = response.usage?.total_tokens ?? promptTokens + completionTokens;

        const costUsd = calculateCostUsd({
          promptPricePerMillion: candidate.promptPricePerMillion,
          completionPricePerMillion: candidate.completionPricePerMillion,
          promptTokens,
          completionTokens,
        });

        // Grava métrica de sucesso para o modelo executado
        const throughputTps =
          latencyMs > 0 ? Math.round((completionTokens / (latencyMs / 1000)) * 10) / 10 : 0;

        this.repository.recordModelMetric({
          model: candidate.id,
          latencyMs,
          throughputTps,
          success: true,
          timestamp: new Date().toISOString(),
        });

        // Grava log de auditoria da requisição
        this.repository.recordRequest({
          id: requestId,
          timestamp: new Date().toISOString(),
          strategy: plan.strategy,
          modelRequested: plan.primaryModel.id,
          modelExecuted: candidate.id,
          promptTokens,
          completionTokens,
          totalTokens,
          costUsd,
          latencyMs,
          fallbackTriggered: isFallback,
          fallbackAttempts,
          statusCode: 200,
        });

        // Notifica adaptadores de observabilidade (Langfuse/OTel)
        if (this.observability) {
          await this.observability.recordTrace({
            requestId,
            timestamp: new Date().toISOString(),
            strategy: plan.strategy,
            modelRequested: plan.primaryModel.id,
            modelExecuted: candidate.id,
            promptTokens,
            completionTokens,
            totalTokens,
            costUsd,
            latencyMs,
            fallbackTriggered: isFallback,
            fallbackAttempts,
            statusCode: 200,
          });
        }

        return {
          requestId,
          response,
          executedModelId: candidate.id,
          fallbackTriggered: isFallback,
          fallbackAttempts,
          costUsd,
          latencyMs,
          strategy: plan.strategy,
        };
      } catch (err: any) {
        const latencyMs = Date.now() - startTime;
        lastError = err;

        // Registra métrica de falha para o modelo atual
        this.repository.recordModelMetric({
          model: candidate.id,
          latencyMs,
          throughputTps: 0,
          success: false,
          timestamp: new Date().toISOString(),
        });

        // Se o erro for retryable e ainda existirem modelos na cadeia, continua para o fallback
        const isRetryable =
          err instanceof OpenRouterError ? err.isRetryable : true;

        if (isRetryable && i < modelsToTry.length - 1) {
          fallbackAttempts++;
          continue;
        }

        // Se não for retryable (ex: erro 400 de formato) ou não houver mais modelos, interrompe o loop
        break;
      }
    }

    // Se todos falharam, grava o log de erro no SQLite
    const statusCode =
      lastError instanceof OpenRouterError ? lastError.statusCode ?? 500 : 500;

    this.repository.recordRequest({
      id: requestId,
      timestamp: new Date().toISOString(),
      strategy: plan.strategy,
      modelRequested: plan.primaryModel.id,
      modelExecuted: 'none',
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      costUsd: 0,
      latencyMs: 0,
      fallbackTriggered: fallbackAttempts > 0,
      fallbackAttempts,
      statusCode,
    });

    throw lastError ?? new Error('Falha desconhecida na execução dos modelos');
  }
}
