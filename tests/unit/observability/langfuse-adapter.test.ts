import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { LangfuseAdapter } from '../../../src/infrastructure/observability/langfuse-adapter.ts';
import type { TraceEvent } from '../../../src/infrastructure/observability/observability-dispatcher.ts';

describe('Infraestrutura: LangfuseAdapter (OTLP Ingestion)', () => {
  const sampleEvent: TraceEvent = {
    requestId: 'req-unit-langfuse-1',
    timestamp: '2026-10-31T12:00:00.000Z',
    strategy: 'price',
    modelRequested: 'openai/gpt-4o-mini',
    modelExecuted: 'openai/gpt-4o-mini',
    promptTokens: 15,
    completionTokens: 25,
    totalTokens: 40,
    costUsd: 0.000018,
    latencyMs: 180,
    fallbackTriggered: false,
    fallbackAttempts: 0,
    statusCode: 200,
  };

  test('deve operar em no-op silencioso se as chaves do Langfuse não estiverem configuradas', async () => {
    let fetchCalled = false;
    const adapter = new LangfuseAdapter({
      fetchFn: async () => {
        fetchCalled = true;
        return new Response('{}', { status: 200 });
      },
    });

    await adapter.dispatch(sampleEvent);
    assert.equal(fetchCalled, false);
  });

  test('deve enviar payload OTLP JSON com headers corretos e atributos de GenAI', async () => {
    let capturedUrl = '';
    let capturedHeaders: Record<string, string> = {};
    let capturedBody: any = null;

    const adapter = new LangfuseAdapter({
      publicKey: 'pk-lf-test',
      secretKey: 'sk-lf-test',
      baseUrl: 'https://us.cloud.langfuse.com',
      fetchFn: async (url, init) => {
        capturedUrl = url.toString();
        capturedHeaders = init?.headers as Record<string, string>;
        capturedBody = JSON.parse(init?.body as string);
        return new Response('{"status":"OK"}', { status: 200 });
      },
    });

    await adapter.dispatch(sampleEvent);

    assert.equal(capturedUrl, 'https://us.cloud.langfuse.com/api/public/otel/v1/traces');
    assert.equal(capturedHeaders['Content-Type'], 'application/json');
    assert.equal(capturedHeaders['x-langfuse-ingestion-version'], '4');
    assert.ok(capturedHeaders['Authorization'].startsWith('Basic '));

    // Valida estrutura OTLP
    assert.ok(capturedBody.resourceSpans);
    assert.equal(capturedBody.resourceSpans.length, 1);

    const span = capturedBody.resourceSpans[0].scopeSpans[0].spans[0];
    assert.equal(span.name, 'chat-completion-price');
    assert.equal(span.traceId.length, 32);
    assert.equal(span.spanId.length, 16);

    const attrMap = Object.fromEntries(
      span.attributes.map((attr: any) => [attr.key, attr.value])
    );
    assert.equal(attrMap['langfuse.type'].stringValue, 'generation');
    assert.equal(attrMap['gen_ai.system'].stringValue, 'openrouter');
    assert.equal(attrMap['gen_ai.request.model'].stringValue, 'openai/gpt-4o-mini');
    assert.equal(attrMap['gen_ai.response.model'].stringValue, 'openai/gpt-4o-mini');
    assert.equal(attrMap['gen_ai.usage.prompt_tokens'].intValue, '15');
    assert.equal(attrMap['gen_ai.usage.completion_tokens'].intValue, '25');
    assert.equal(attrMap['gen_ai.usage.cost'].doubleValue, 0.000018);
    assert.equal(attrMap['gateway.strategy'].stringValue, 'price');
  });

  test('deve lançar erro caso o endpoint OTLP responda com status HTTP diferente de 2xx', async () => {
    const adapter = new LangfuseAdapter({
      publicKey: 'pk-lf-test',
      secretKey: 'sk-lf-test',
      fetchFn: async () => {
        return new Response('Unauthorized', { status: 401 });
      },
    });

    await assert.rejects(
      async () => {
        await adapter.dispatch(sampleEvent);
      },
      /Langfuse OTLP Ingestion falhou com status 401/
    );
  });
});
