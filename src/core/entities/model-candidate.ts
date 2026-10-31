export type RoutingStrategyType = 'price' | 'latency' | 'throughput';

export interface ModelCandidate {
  id: string;
  name: string;
  promptPricePerMillion: number;
  completionPricePerMillion: number;
  avgLatencyMs?: number;
  avgThroughputTps?: number;
  contextLength: number;
}

export interface RoutePlan {
  strategy: RoutingStrategyType;
  primaryModel: ModelCandidate;
  fallbackChain: ModelCandidate[];
}
