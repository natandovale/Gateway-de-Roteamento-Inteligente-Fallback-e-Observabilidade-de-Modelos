export interface CostCalculationParams {
  promptPricePerMillion: number;
  completionPricePerMillion: number;
  promptTokens: number;
  completionTokens: number;
}

export function calculateCostUsd(params: CostCalculationParams): number {
  const promptCost = (params.promptTokens / 1_000_000) * params.promptPricePerMillion;
  const completionCost = (params.completionTokens / 1_000_000) * params.completionPricePerMillion;
  const total = promptCost + completionCost;

  // Arredonda para 6 casas decimais evitando ruídos de ponto flutuante
  return Math.round(total * 1_000_000) / 1_000_000;
}
