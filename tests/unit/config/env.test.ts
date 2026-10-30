import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEnv } from '../../../src/config/env.ts';

describe('Configuração de Ambiente (Fail-Fast)', () => {
  test('deve lançar erro se OPENROUTER_API_KEY estiver ausente', () => {
    const invalidEnv = {
      NODE_ENV: 'test',
    };

    assert.throws(
      () => loadEnv(invalidEnv as unknown as NodeJS.ProcessEnv),
      (err: Error) => {
        assert.match(err.message, /OPENROUTER_API_KEY/);
        return true;
      }
    );
  });

  test('deve carregar configuração com valores padrão válidos', () => {
    const rawEnv = {
      OPENROUTER_API_KEY: 'sk-or-test-key-12345',
    };

    const config = loadEnv(rawEnv as unknown as NodeJS.ProcessEnv);

    assert.equal(config.OPENROUTER_API_KEY, 'sk-or-test-key-12345');
    assert.equal(config.NODE_ENV, 'development');
    assert.equal(config.PORT, 3000);
    assert.equal(config.HOST, '0.0.0.0');
    assert.equal(config.DATABASE_PATH, './data/gateway.db');
    assert.equal(config.DEFAULT_ROUTING_STRATEGY, 'price');
    assert.equal(config.REQUEST_TIMEOUT_MS, 15000);
    assert.equal(config.OPENROUTER_BASE_URL, 'https://openrouter.ai/api/v1');
  });

  test('deve respeitar valores customizados passados pelo ambiente', () => {
    const customEnv = {
      OPENROUTER_API_KEY: 'sk-or-custom-key',
      NODE_ENV: 'production',
      PORT: '8080',
      DATABASE_PATH: '/tmp/test.db',
      DEFAULT_ROUTING_STRATEGY: 'latency',
      REQUEST_TIMEOUT_MS: '5000',
    };

    const config = loadEnv(customEnv as unknown as NodeJS.ProcessEnv);

    assert.equal(config.NODE_ENV, 'production');
    assert.equal(config.PORT, 8080);
    assert.equal(config.DATABASE_PATH, '/tmp/test.db');
    assert.equal(config.DEFAULT_ROUTING_STRATEGY, 'latency');
    assert.equal(config.REQUEST_TIMEOUT_MS, 5000);
  });
});
