import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ObservabilityDispatcher, type TraceEvent } from '../../../src/infrastructure/observability/observability-dispatcher.ts';

describe('Infraestrutura: ObservabilityDispatcher (Langfuse & OTel)', () => {
  test('deve despachar eventos de trace com sucesso para adaptadores registrados', async () => {
    const receivedEvents: TraceEvent[] = [];

    const mockAdapter = {
      name: 'mock-logger',
      dispatch: async (event: TraceEvent) => {
        receivedEvents.push(event);
      },
    };

    const dispatcher = new ObservabilityDispatcher();
    dispatcher.registerAdapter(mockAdapter);

    const event: TraceEvent = {
      requestId: 'req-test-123',
      timestamp: new Date().toISOString(),
      strategy: 'price',
      modelRequested: 'gateway/auto-cheap',
      modelExecuted: 'meta-llama/llama-3.1-8b-instruct',
      promptTokens: 25,
      completionTokens: 50,
      totalTokens: 75,
      costUsd: 0.000045,
      latencyMs: 320,
      fallbackTriggered: false,
      fallbackAttempts: 0,
      statusCode: 200,
    };

    await dispatcher.recordTrace(event);

    assert.equal(receivedEvents.length, 1);
    assert.equal(receivedEvents[0].requestId, 'req-test-123');
    assert.equal(receivedEvents[0].costUsd, 0.000045);
    assert.equal(receivedEvents[0].modelExecuted, 'meta-llama/llama-3.1-8b-instruct');
  });

  test('falhas em adaptadores de observabilidade não devem quebrar a aplicação principal', async () => {
    const failingAdapter = {
      name: 'failing-adapter',
      dispatch: async () => {
        throw new Error('Falha de rede no Langfuse');
      },
    };

    const dispatcher = new ObservabilityDispatcher();
    dispatcher.registerAdapter(failingAdapter);

    const event: TraceEvent = {
      requestId: 'req-test-error',
      timestamp: new Date().toISOString(),
      strategy: 'latency',
      modelRequested: 'openai/gpt-4o-mini',
      modelExecuted: 'openai/gpt-4o-mini',
      promptTokens: 10,
      completionTokens: 10,
      totalTokens: 20,
      costUsd: 0.00001,
      latencyMs: 150,
      fallbackTriggered: false,
      fallbackAttempts: 0,
      statusCode: 200,
    };

    // Não deve lançar erro
    await assert.doesNotReject(async () => {
      await dispatcher.recordTrace(event);
    });
  });
});
