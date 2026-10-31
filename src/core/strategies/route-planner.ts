import type { ModelCandidate, RoutePlan, RoutingStrategyType } from '../entities/model-candidate.ts';
import type { IRoutingStrategy } from './price-strategy.ts';
import { PriceStrategy } from './price-strategy.ts';
import { LatencyStrategy } from './latency-strategy.ts';
import { ThroughputStrategy } from './throughput-strategy.ts';

export interface CreatePlanParams {
  strategy: RoutingStrategyType;
  requestedModelId?: string;
  candidates: ModelCandidate[];
}

export class RoutePlanner {
  private strategies: Record<RoutingStrategyType, IRoutingStrategy>;

  constructor() {
    this.strategies = {
      price: new PriceStrategy(),
      latency: new LatencyStrategy(),
      throughput: new ThroughputStrategy(),
    };
  }

  public createPlan(params: CreatePlanParams): RoutePlan {
    const { strategy, requestedModelId, candidates } = params;

    if (!candidates || candidates.length === 0) {
      throw new Error('Nenhum modelo candidato disponível para roteamento');
    }

    const strategyEngine = this.strategies[strategy] ?? this.strategies.price;
    const rankedCandidates = strategyEngine.rank(candidates);

    // Se o cliente requisitou um modelo específico (ex: "openai/gpt-4o-mini"),
    // colocamos ele como primário e os demais ranqueados como fallback
    if (requestedModelId) {
      const explicitPrimary = candidates.find((c) => c.id === requestedModelId);

      if (explicitPrimary) {
        const fallbacks = rankedCandidates.filter((c) => c.id !== requestedModelId);
        return {
          strategy,
          primaryModel: explicitPrimary,
          fallbackChain: fallbacks,
        };
      }
    }

    // Caso não seja um modelo explícito ou o modelo solicitado seja dinâmico (auto-cheap, auto-fast, etc.)
    const [primary, ...fallbacks] = rankedCandidates;

    return {
      strategy,
      primaryModel: primary,
      fallbackChain: fallbacks,
    };
  }
}
