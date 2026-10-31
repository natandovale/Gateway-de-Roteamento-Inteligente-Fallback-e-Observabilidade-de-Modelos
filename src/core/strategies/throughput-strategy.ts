import type { ModelCandidate } from '../entities/model-candidate.ts';
import type { IRoutingStrategy } from './price-strategy.ts';

//Ordena os modelos pela maior taxa de transferência (tokens/segundo)
export class ThroughputStrategy implements IRoutingStrategy {
  public rank(candidates: ModelCandidate[]): ModelCandidate[] {
    return [...candidates].sort((a, b) => {
      const tpsA = a.avgThroughputTps ?? 0;
      const tpsB = b.avgThroughputTps ?? 0;
      return tpsB - tpsA;
    });
  }
}
