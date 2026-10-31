import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { SqliteRepository } from '../../../src/infrastructure/database/sqlite-repository.ts';
import { ExecutionService } from '../../../src/services/execution-service.ts';
import { OpenRouterError } from '../../../src/infrastructure/providers/openrouter-client.ts';
import type { RoutePlan, ModelCandidate } from '../../../src/core/entities/model-candidate.ts';

describe('Application Service: ExecutionService com Fallback', () => {
  let repo: SqliteRepository;

  const candidateA: ModelCandidate = {
    id: 'primary/expensive-model',
    name: 'Primary Expensive',
    promptPricePerMillion: 2.0,
    completionPricePerMillion: 8.0,
    contextLength: 128000,
  };

  const candidateB: ModelCandidate = {
    id: 'secondary/fallback-model',
    name: 'Secondary Fallback',
    promptPricePerMillion: 0.1,
    completionPricePerMillion: 0.2,
    contextLength: 128000,
  };

  beforeEach(() => {
    repo = new SqliteRepository(':memory:');
    repo.init();
  });

  afterEach(() => {
    repo.close();
  });

  test('deve executar o modelo primário com sucesso e registrar auditoria', async () => {
    const mockClient = {
      createChatCompletion: async (params: { model: string }) => {
        return {
          id: 'chatcmpl-success',
          object: 'chat.completion',
          created: 1729000000,
          model: params.model,
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: 'Sucesso primário' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
        };
      },
    };

    const service = new ExecutionService({
      client: mockClient as any,
      repository: repo,
    });

    const plan: RoutePlan = {
      strategy: 'price',
      primaryModel: candidateA,
      fallbackChain: [candidateB],
    };

    const result = await service.execute({
      plan,
      messages: [{ role: 'user', content: 'Olá' }],
    });

    assert.equal(result.executedModelId, 'primary/expensive-model');
    assert.equal(result.fallbackTriggered, false);
    assert.equal(result.fallbackAttempts, 0);
    assert.equal(result.response.choices[0].message.content, 'Sucesso primário');
    assert.ok(result.costUsd > 0);

    // Valida auditoria no SQLite
    const logs = repo.getRequestLogs(1);
    assert.equal(logs.length, 1);
    assert.equal(logs[0].model_executed, 'primary/expensive-model');
    assert.equal(logs[0].fallback_triggered, 0);
  });

  test('deve acionar fallback para o modelo secundário se o primário falhar com 429', async () => {
    let callCount = 0;

    const mockClient = {
      createChatCompletion: async (params: { model: string }) => {
        callCount++;
        if (params.model === 'primary/expensive-model') {
          throw new OpenRouterError('Rate limit exceeded', {
            statusCode: 429,
            isRetryable: true,
          });
        }

        return {
          id: 'chatcmpl-fallback',
          object: 'chat.completion',
          created: 1729000000,
          model: params.model,
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: 'Sucesso do fallback' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
        };
      },
    };

    const service = new ExecutionService({
      client: mockClient as any,
      repository: repo,
    });

    const plan: RoutePlan = {
      strategy: 'price',
      primaryModel: candidateA,
      fallbackChain: [candidateB],
    };

    const result = await service.execute({
      plan,
      messages: [{ role: 'user', content: 'Olá' }],
    });

    assert.equal(callCount, 2);
    assert.equal(result.executedModelId, 'secondary/fallback-model');
    assert.equal(result.fallbackTriggered, true);
    assert.equal(result.fallbackAttempts, 1);
    assert.equal(result.response.choices[0].message.content, 'Sucesso do fallback');

    // Valida auditoria com indicação de fallback
    const logs = repo.getRequestLogs(1);
    assert.equal(logs.length, 1);
    assert.equal(logs[0].model_executed, 'secondary/fallback-model');
    assert.equal(logs[0].fallback_triggered, 1);
    assert.equal(logs[0].fallback_attempts, 1);
  });

  test('deve lançar erro se todos os modelos (primário e cadeia de fallback) falharem', async () => {
    const mockClient = {
      createChatCompletion: async () => {
        throw new OpenRouterError('Todos os modelos falharam', {
          statusCode: 503,
          isRetryable: true,
        });
      },
    };

    const service = new ExecutionService({
      client: mockClient as any,
      repository: repo,
    });

    const plan: RoutePlan = {
      strategy: 'price',
      primaryModel: candidateA,
      fallbackChain: [candidateB],
    };

    await assert.rejects(
      () =>
        service.execute({
          plan,
          messages: [{ role: 'user', content: 'Olá' }],
        }),
      /Todos os modelos falharam/
    );

    // Valida que a requisição com falha também foi auditada
    const logs = repo.getRequestLogs(1);
    assert.equal(logs.length, 1);
    assert.equal(logs[0].status_code, 503);
  });
});
