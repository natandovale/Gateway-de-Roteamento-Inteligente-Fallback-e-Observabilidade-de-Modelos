import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { SqliteRepository } from '../../../src/infrastructure/database/sqlite-repository.ts';

describe('Persistência Stateful: SqliteRepository (node:sqlite)', () => {
  let repo: SqliteRepository;

  beforeEach(() => {
    // Usamos banco em memória para isolamento total dos testes
    repo = new SqliteRepository(':memory:');
    repo.init();
  });

  afterEach(() => {
    repo.close();
  });

  test('deve inicializar as tabelas necessárias sem erros', () => {
    const tables = repo.listTables();
    assert.ok(tables.includes('requests_log'));
    assert.ok(tables.includes('model_metrics'));
    assert.ok(tables.includes('models_cache'));
  });

  test('deve registrar e consultar logs de requisição (auditoria)', () => {
    repo.recordRequest({
      id: 'req-001',
      timestamp: new Date().toISOString(),
      strategy: 'price',
      modelRequested: 'gateway/auto-cheap',
      modelExecuted: 'meta-llama/llama-3.1-8b-instruct',
      promptTokens: 15,
      completionTokens: 25,
      totalTokens: 40,
      costUsd: 0.000035,
      latencyMs: 350,
      fallbackTriggered: false,
      fallbackAttempts: 0,
      statusCode: 200,
    });

    const logs = repo.getRequestLogs(10);
    assert.equal(logs.length, 1);
    assert.equal(logs[0].id, 'req-001');
    assert.equal(logs[0].model_executed, 'meta-llama/llama-3.1-8b-instruct');
    assert.equal(logs[0].cost_usd, 0.000035);
    assert.equal(logs[0].fallback_triggered, 0);
  });

  test('deve registrar métricas de modelos e calcular resumo de performance', () => {
    // Registra duas amostras para o modelo A
    repo.recordModelMetric({
      model: 'meta-llama/llama-3.1-8b-instruct',
      latencyMs: 200,
      throughputTps: 50,
      success: true,
      timestamp: new Date().toISOString(),
    });

    repo.recordModelMetric({
      model: 'meta-llama/llama-3.1-8b-instruct',
      latencyMs: 400,
      throughputTps: 70,
      success: true,
      timestamp: new Date().toISOString(),
    });

    const summary = repo.getModelPerformanceSummary('meta-llama/llama-3.1-8b-instruct');
    assert.ok(summary);
    assert.equal(summary.total_requests, 2);
    assert.equal(summary.avg_latency_ms, 300); // (200 + 400) / 2
    assert.equal(summary.avg_throughput_tps, 60); // (50 + 70) / 2
    assert.equal(summary.error_count, 0);
  });

  test('deve salvar e recuperar catálogo de modelos em cache', () => {
    const sampleModels = [
      {
        id: 'openai/gpt-4o-mini',
        name: 'GPT-4o Mini',
        promptPricePerMillion: 0.15,
        completionPricePerMillion: 0.6,
        contextLength: 128000,
      },
      {
        id: 'meta-llama/llama-3.1-8b-instruct',
        name: 'Llama 3.1 8B',
        promptPricePerMillion: 0.05,
        completionPricePerMillion: 0.08,
        contextLength: 131072,
      },
    ];

    repo.saveModelsCache(sampleModels);
    const cached = repo.getCachedModels();

    assert.equal(cached.length, 2);
    // Ordenado por menor preço: Llama 3.1 8B (0.05) vem antes de GPT-4o Mini (0.15)
    assert.equal(cached[0].id, 'meta-llama/llama-3.1-8b-instruct');
    assert.equal(cached[0].prompt_price_per_million, 0.05);
    assert.equal(cached[1].id, 'openai/gpt-4o-mini');
    assert.equal(cached[1].prompt_price_per_million, 0.15);
  });
});
