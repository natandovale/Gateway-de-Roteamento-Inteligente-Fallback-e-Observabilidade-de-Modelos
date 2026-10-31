import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { OpenRouterClient, OpenRouterError } from '../../../src/infrastructure/providers/openrouter-client.ts';

describe('Infraestrutura: OpenRouterClient', () => {
  test('deve executar uma chamada de chat completion com sucesso', async () => {
    // Mock do fetch global simulando retorno de sucesso
    const mockFetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
      assert.match(url.toString(), /\/chat\/completions$/);
      assert.equal(init?.method, 'POST');
      assert.equal((init?.headers as Record<string, string>)['Authorization'], 'Bearer sk-or-test-key');

      const mockBody = {
        id: 'chatcmpl-test-123',
        object: 'chat.completion',
        created: 1729000000,
        model: 'meta-llama/llama-3.1-8b-instruct',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Resposta mockada' },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      };

      return new Response(JSON.stringify(mockBody), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const client = new OpenRouterClient({
      apiKey: 'sk-or-test-key',
      baseUrl: 'https://openrouter.ai/api/v1',
      timeoutMs: 2000,
      fetchFn: mockFetch as typeof fetch,
    });

    const response = await client.createChatCompletion({
      model: 'meta-llama/llama-3.1-8b-instruct',
      messages: [{ role: 'user', content: 'Olá' }],
    });

    assert.equal(response.id, 'chatcmpl-test-123');
    assert.equal(response.model, 'meta-llama/llama-3.1-8b-instruct');
    assert.equal(response.choices[0].message.content, 'Resposta mockada');
    assert.equal(response.usage?.total_tokens, 30);
  });

  test('deve lançar OpenRouterError ao receber erro HTTP do upstream (ex: 429)', async () => {
    const mockFetch = async (): Promise<Response> => {
      return new Response(
        JSON.stringify({
          error: { message: 'Rate limit exceeded', code: 429 },
        }),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    };

    const client = new OpenRouterClient({
      apiKey: 'sk-or-test-key',
      baseUrl: 'https://openrouter.ai/api/v1',
      timeoutMs: 2000,
      fetchFn: mockFetch as typeof fetch,
    });

    await assert.rejects(
      () =>
        client.createChatCompletion({
          model: 'meta-llama/llama-3.1-8b-instruct',
          messages: [{ role: 'user', content: 'Olá' }],
        }),
      (err: Error) => {
        assert.ok(err instanceof OpenRouterError);
        assert.equal(err.statusCode, 429);
        assert.equal(err.isRetryable, true);
        return true;
      }
    );
  });

  test('deve tratar timeout abortando a requisição e lançando OpenRouterError retryable', async () => {
    const mockFetch = async (_url: unknown, init?: RequestInit): Promise<Response> => {
      return new Promise((_, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const abortError = new Error('The operation was aborted');
          abortError.name = 'AbortError';
          reject(abortError);
        });
      });
    };

    const client = new OpenRouterClient({
      apiKey: 'sk-or-test-key',
      baseUrl: 'https://openrouter.ai/api/v1',
      timeoutMs: 50, // Timeout bem curto para o teste
      fetchFn: mockFetch as typeof fetch,
    });

    await assert.rejects(
      () =>
        client.createChatCompletion({
          model: 'meta-llama/llama-3.1-8b-instruct',
          messages: [{ role: 'user', content: 'Olá' }],
        }),
      (err: Error) => {
        assert.ok(err instanceof OpenRouterError);
        assert.equal(err.isTimeout, true);
        assert.equal(err.isRetryable, true);
        return true;
      }
    );
  });
});
