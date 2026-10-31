import type { ModelCandidate } from '../entities/model-candidate.ts';
import type { IRoutingStrategy } from './price-strategy.ts';

//Ordena os modelos pela menor latência histórica (ms)
export class LatencyStrategy implements IRoutingStrategy {
  public rank(candidates: ModelCandidate[]): ModelCandidate[] {
    return [...candidates].sort((a, b) => {
      // Se não houver métrica histórica ainda, atribui Infinity para ficar no fim da fila
      const latA = a.avgLatencyMs ?? Number.POSITIVE_INFINITY;
      const latB = b.avgLatencyMs ?? Number.POSITIVE_INFINITY;
      return latA - latB;
    });
  }
}
