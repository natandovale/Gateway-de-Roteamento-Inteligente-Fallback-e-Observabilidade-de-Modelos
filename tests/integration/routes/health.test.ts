import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEnv } from '../../../src/config/env.ts';
import { buildServer } from '../../../src/infrastructure/http/server.ts';

describe('Integração: Rota GET /health', () => {
  test('deve responder com status HTTP 200 e status "ok"', async () => {
    const config = loadEnv({
      OPENROUTER_API_KEY: 'sk-or-test-mock-key',
      NODE_ENV: 'test',
      DATABASE_PATH: ':memory:',
    } as unknown as NodeJS.ProcessEnv);

    const server = await buildServer(config);

    const response = await server.inject({
      method: 'GET',
      url: '/health',
    });

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.payload);
    assert.equal(body.status, 'ok');
    assert.ok(body.timestamp);
    assert.equal(body.env, 'test');

    await server.close();
  });
});
