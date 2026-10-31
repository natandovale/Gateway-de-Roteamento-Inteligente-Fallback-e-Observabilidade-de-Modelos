import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { buildServer } from '../../../src/infrastructure/http/server.ts';
import { SqliteRepository } from '../../../src/infrastructure/database/sqlite-repository.ts';
import { OpenRouterClient } from '../../../src/infrastructure/providers/openrouter-client.ts';
import { loadEnv } from '../../../src/config/env.ts';
import type { FastifyInstance } from 'fastify';

describe('Integração: POST /v1/chat/completions (OpenAI Compatible)', () => {
  let server: FastifyInstance;
  let repo: SqliteRepository;

  const sampleModels = [
    {
      id: 'openai/gpt-4o-mini',
      name: 'GPT-4o Mini',
      promptPricePerMillion: 0.15,
      completionPricePerMillion: 0.60,
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

  beforeEach(async () => {
    repo = new SqliteRepository(':memory:');
    repo.init();
    repo.saveModelsCache(sampleModels);

    const config = loadEnv({
      OPENROUTER_API_KEY: 'sk-or-mock-key',
      NODE_ENV: 'test',
      DATABASE_PATH: ':memory:',
    } as unknown as NodeJS.ProcessEnv);

    // Mock do OpenRouterClient injetado via dependências
    const mockClient = new OpenRouterClient({
      apiKey: 'sk-or-mock-key',
      fetchFn: async () => {
        return new Response(
          JSON.stringify({
            id: 'chatcmpl-gateway-123',
            object: 'chat.completion',
            created: 1729000000,
            model: 'meta-llama/llama-3.1-8b-instruct',
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: 'Resposta OpenAI via Gateway' },
                finish_reason: 'stop',
              },
            ],
            usage: {
              prompt_tokens: 12,
              completion_tokens: 8,
              total_tokens: 20,
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      },
    });

    server = await buildServer(config, {
      db: repo,
      client: mockClient,
    });
  });

  afterEach(async () => {
    await server.close();
  });

  test('deve processar completion, responder com payload OpenAI e headers x-gateway-*', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/v1/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        'x-routing-strategy': 'price',
      },
      payload: {
        model: 'gateway/auto-cheap',
        messages: [{ role: 'user', content: 'Qual é a capital da França?' }],
      },
    });

    assert.equal(response.statusCode, 200);

    // Valida headers exclusivos do gateway
    assert.equal(response.headers['x-gateway-strategy'], 'price');
    assert.equal(response.headers['x-gateway-model-requested'], 'meta-llama/llama-3.1-8b-instruct');
    assert.equal(response.headers['x-gateway-model-executed'], 'meta-llama/llama-3.1-8b-instruct');
    assert.equal(response.headers['x-gateway-fallback-triggered'], 'false');
    assert.equal(response.headers['x-gateway-fallback-attempts'], '0');
    assert.ok(response.headers['x-gateway-cost-usd']);
    assert.ok(response.headers['x-gateway-latency-ms']);

    // Valida corpo da resposta compatível com a OpenAI
    const body = JSON.parse(response.payload);
    assert.equal(body.id, 'chatcmpl-gateway-123');
    assert.equal(body.object, 'chat.completion');
    assert.equal(body.choices[0].message.content, 'Resposta OpenAI via Gateway');
    assert.equal(body.usage.total_tokens, 20);
  });

  test('deve retornar erro 400 com formato padrão OpenAI caso o payload seja inválido', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/v1/chat/completions',
      payload: {
        // Sem o campo messages obrigatório
        model: 'openai/gpt-4o-mini',
      },
    });

    assert.equal(response.statusCode, 400);
    const body = JSON.parse(response.payload);
    assert.ok(body.error);
    assert.equal(body.error.type, 'invalid_request_error');
    assert.match(body.error.message, /messages/);
  });
});
