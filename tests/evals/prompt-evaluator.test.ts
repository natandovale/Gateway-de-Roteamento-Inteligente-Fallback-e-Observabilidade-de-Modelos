import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { PromptEvaluator, type EvaluationCriteria } from '../../src/core/evals/prompt-evaluator.ts';

describe('Evaluation Tests: Validação Automatizada de Prompts', () => {
  const evaluator = new PromptEvaluator();

  test('deve avaliar com sucesso resposta contendo formato JSON válido', () => {
    const responseText = '```json\n{"summary": "Teste", "sentiment": "positive"}\n```';
    const criteria: EvaluationCriteria = {
      mustContainJson: true,
      minWordCount: 2,
    };

    const result = evaluator.evaluate(responseText, criteria);

    assert.equal(result.passed, true);
    assert.equal(result.score, 1.0);
    assert.equal(result.details.jsonValid, true);
  });

  test('deve reprovar resposta que não contenha palavras-chave obrigatórias', () => {
    const responseText = 'Apenas uma resposta genérica sem a chave requerida.';
    const criteria: EvaluationCriteria = {
      requiredKeywords: ['TypeScript', 'Gateway'],
      minWordCount: 5,
    };

    const result = evaluator.evaluate(responseText, criteria);

    assert.equal(result.passed, false);
    assert.ok(result.score < 1.0);
    assert.deepEqual(result.details.missingKeywords, ['TypeScript', 'Gateway']);
  });

  test('deve reprovar resposta que exceda a latência limite aceitável de SLA', () => {
    const responseText = 'Resposta de alta qualidade gerada pelo modelo.';
    const criteria: EvaluationCriteria = {
      maxLatencyMs: 500,
    };

    const result = evaluator.evaluate(responseText, criteria, { latencyMs: 850 });

    assert.equal(result.passed, false);
    assert.equal(result.details.latencyAcceptable, false);
    assert.match(result.details.latencyReason ?? '', /Latência 850ms excedeu o SLA de 500ms/);
  });
});
