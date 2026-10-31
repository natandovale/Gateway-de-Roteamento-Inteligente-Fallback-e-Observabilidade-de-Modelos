import type { IObservabilityAdapter, TraceEvent } from './observability-dispatcher.ts';

export interface LangfuseConfig {
  publicKey?: string;
  secretKey?: string;
  baseUrl?: string;
}

export class LangfuseAdapter implements IObservabilityAdapter {
  public name = 'LangfuseAdapter';
  private config: LangfuseConfig;

  constructor(config: LangfuseConfig) {
    this.config = config;
  }

  public async dispatch(event: TraceEvent): Promise<void> {
    if (!this.config.publicKey || !this.config.secretKey) {
      // Se não configurado, opera em modo no-op silencioso
      return;
    }

    // Estrutura do payload compatível com a Ingestion API do Langfuse
    const payload = {
      batch: [
        {
          id: event.requestId,
          type: 'generation-create',
          timestamp: event.timestamp,
          body: {
            traceId: event.requestId,
            name: `gateway-${event.strategy}`,
            model: event.modelExecuted,
            modelParameters: {
              strategy: event.strategy,
              modelRequested: event.modelRequested,
              fallbackTriggered: event.fallbackTriggered,
            },
            usage: {
              promptTokens: event.promptTokens,
              completionTokens: event.completionTokens,
              totalTokens: event.totalTokens,
              calculatedCost: event.costUsd,
            },
            metadata: {
              latencyMs: event.latencyMs,
              fallbackAttempts: event.fallbackAttempts,
              statusCode: event.statusCode,
            },
          },
        },
      ],
    };

    const url = `${this.config.baseUrl ?? 'https://cloud.langfuse.com'}/api/public/ingestion`;
    const auth = Buffer.from(`${this.config.publicKey}:${this.config.secretKey}`).toString('base64');

    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(payload),
    });
  }
}
