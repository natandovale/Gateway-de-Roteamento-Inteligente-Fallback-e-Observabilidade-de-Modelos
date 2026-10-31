import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calculateCostUsd } from '../../../src/core/entities/cost-calculator.ts';

describe('Core Domain: CostCalculator', () => {
  test('deve calcular corretamente o custo de uma requisição em USD', () => {
    // Modelo com prompt: $0.15 / 1M e completion: $0.60 / 1M
    const promptPricePerMillion = 0.15;
    const completionPricePerMillion = 0.60;
    const promptTokens = 1000;
    const completionTokens = 500;

    // Custo esperado:
    // Prompt: (1000 / 1_000_000) * 0.15 = 0.00015
    // Completion: (500 / 1_000_000) * 0.60 = 0.00030
    // Total = 0.00045
    const cost = calculateCostUsd({
      promptPricePerMillion,
      completionPricePerMillion,
      promptTokens,
      completionTokens,
    });

    assert.equal(cost, 0.00045);
  });

  test('deve retornar 0 quando o consumo de tokens for 0', () => {
    const cost = calculateCostUsd({
      promptPricePerMillion: 2.5,
      completionPricePerMillion: 10.0,
      promptTokens: 0,
      completionTokens: 0,
    });

    assert.equal(cost, 0);
  });
});
