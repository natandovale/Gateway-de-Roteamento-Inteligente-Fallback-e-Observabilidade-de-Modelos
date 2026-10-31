import type { ModelCandidate } from '../entities/model-candidate.ts';

export interface IRoutingStrategy {
  rank(candidates: ModelCandidate[]): ModelCandidate[];
}

//Ordena os modelos pelo menor custo combinado por 1M tokens (prompt + completion)
export class PriceStrategy implements IRoutingStrategy {
  public rank(candidates: ModelCandidate[]): ModelCandidate[] {
    return [...candidates].sort((a, b) => {
      const costA = a.promptPricePerMillion + a.completionPricePerMillion;
      const costB = b.promptPricePerMillion + b.completionPricePerMillion;
      return costA - costB;
    });
  }
}
