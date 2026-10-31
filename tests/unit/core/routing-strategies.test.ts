import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import type { ModelCandidate, RoutingStrategyType } from '../../../src/core/entities/model-candidate.ts';
import { PriceStrategy } from '../../../src/core/strategies/price-strategy.ts';
import { LatencyStrategy } from '../../../src/core/strategies/latency-strategy.ts';
import { ThroughputStrategy } from '../../../src/core/strategies/throughput-strategy.ts';
import { RoutePlanner } from '../../../src/core/strategies/route-planner.ts';

describe('Core Domain: Estratégias de Roteamento e Fallback', () => {
  const sampleCandidates: ModelCandidate[] = [
    {
      id: 'openai/gpt-4o-mini',
      name: 'GPT-4o Mini',
      promptPricePerMillion: 0.15,
      completionPricePerMillion: 0.60,
      avgLatencyMs: 350,
      avgThroughputTps: 80,
      contextLength: 128000,
    },
    {
      id: 'meta-llama/llama-3.1-8b-instruct',
      name: 'Llama 3.1 8B',
      promptPricePerMillion: 0.05,
      completionPricePerMillion: 0.08,
      avgLatencyMs: 200,
      avgThroughputTps: 110,
      contextLength: 131072,
    },
    {
      id: 'anthropic/claude-3.5-haiku',
      name: 'Claude 3.5 Haiku',
      promptPricePerMillion: 0.80,
      completionPricePerMillion: 4.00,
      avgLatencyMs: 180,
      avgThroughputTps: 140,
      contextLength: 200000,
    },
  ];

  describe('PriceStrategy', () => {
    test('deve ordenar modelos pelo menor custo combinado por milhão de tokens', () => {
      const strategy = new PriceStrategy();
      const ranked = strategy.rank(sampleCandidates);

      // Llama (0.05 + 0.08 = 0.13) < GPT-4o Mini (0.15 + 0.60 = 0.75) < Claude Haiku (0.80 + 4.00 = 4.80)
      assert.equal(ranked[0].id, 'meta-llama/llama-3.1-8b-instruct');
      assert.equal(ranked[1].id, 'openai/gpt-4o-mini');
      assert.equal(ranked[2].id, 'anthropic/claude-3.5-haiku');
    });
  });

  describe('LatencyStrategy', () => {
    test('deve ordenar modelos pela menor latência média histórica', () => {
      const strategy = new LatencyStrategy();
      const ranked = strategy.rank(sampleCandidates);

      // Claude Haiku (180ms) < Llama (200ms) < GPT-4o Mini (350ms)
      assert.equal(ranked[0].id, 'anthropic/claude-3.5-haiku');
      assert.equal(ranked[1].id, 'meta-llama/llama-3.1-8b-instruct');
      assert.equal(ranked[2].id, 'openai/gpt-4o-mini');
    });

    test('modelos sem histórico de latência devem ser posicionados com penalidade neutra no final', () => {
      const candidatesWithUnknown: ModelCandidate[] = [
        ...sampleCandidates,
        {
          id: 'google/gemini-2.0-flash',
          name: 'Gemini 2.0 Flash',
          promptPricePerMillion: 0.10,
          completionPricePerMillion: 0.40,
          avgLatencyMs: undefined,
          avgThroughputTps: undefined,
          contextLength: 1000000,
        },
      ];

      const strategy = new LatencyStrategy();
      const ranked = strategy.rank(candidatesWithUnknown);

      assert.equal(ranked[ranked.length - 1].id, 'google/gemini-2.0-flash');
    });
  });

  describe('ThroughputStrategy', () => {
    test('deve ordenar modelos pelo maior throughput de tokens por segundo', () => {
      const strategy = new ThroughputStrategy();
      const ranked = strategy.rank(sampleCandidates);

      // Claude Haiku (140 TPS) > Llama (110 TPS) > GPT-4o Mini (80 TPS)
      assert.equal(ranked[0].id, 'anthropic/claude-3.5-haiku');
      assert.equal(ranked[1].id, 'meta-llama/llama-3.1-8b-instruct');
      assert.equal(ranked[2].id, 'openai/gpt-4o-mini');
    });
  });

  describe('RoutePlanner', () => {
    test('deve criar um plano de rota com modelo primário e cadeia de fallback para a estratégia informada', () => {
      const planner = new RoutePlanner();
      const plan = planner.createPlan({
        strategy: 'price',
        candidates: sampleCandidates,
      });

      assert.equal(plan.strategy, 'price');
      assert.equal(plan.primaryModel.id, 'meta-llama/llama-3.1-8b-instruct');
      assert.equal(plan.fallbackChain.length, 2);
      assert.equal(plan.fallbackChain[0].id, 'openai/gpt-4o-mini');
      assert.equal(plan.fallbackChain[1].id, 'anthropic/claude-3.5-haiku');
    });

    test('quando o cliente requisitar um modelo específico, ele deve ser o primário e os demais servir de fallback', () => {
      const planner = new RoutePlanner();
      const plan = planner.createPlan({
        strategy: 'price',
        requestedModelId: 'openai/gpt-4o-mini',
        candidates: sampleCandidates,
      });

      assert.equal(plan.primaryModel.id, 'openai/gpt-4o-mini');
      // O modelo primário não deve se repetir na cadeia de fallback
      assert.ok(!plan.fallbackChain.some((m) => m.id === 'openai/gpt-4o-mini'));
      assert.equal(plan.fallbackChain.length, 2);
      // Os fallbacks respeitam a estratégia selecionada (price)
      assert.equal(plan.fallbackChain[0].id, 'meta-llama/llama-3.1-8b-instruct');
      assert.equal(plan.fallbackChain[1].id, 'anthropic/claude-3.5-haiku');
    });

    test('deve lançar erro se a lista de candidatos for vazia', () => {
      const planner = new RoutePlanner();
      assert.throws(
        () =>
          planner.createPlan({
            strategy: 'price',
            candidates: [],
          }),
        /Nenhum modelo candidato disponível/
      );
    });
  });
});
