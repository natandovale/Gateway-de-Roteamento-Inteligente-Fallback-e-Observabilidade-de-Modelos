export interface TraceEvent {
  requestId: string;
  timestamp: string;
  strategy: string;
  modelRequested: string;
  modelExecuted: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  latencyMs: number;
  fallbackTriggered: boolean;
  fallbackAttempts: number;
  statusCode: number;
}

export interface IObservabilityAdapter {
  name: string;
  dispatch(event: TraceEvent): Promise<void>;
}

export class ObservabilityDispatcher {
  private adapters: IObservabilityAdapter[] = [];

  public registerAdapter(adapter: IObservabilityAdapter): void {
    this.adapters.push(adapter);
  }

  public async recordTrace(event: TraceEvent): Promise<void> {
    // Dispara em paralelo para todos os adaptadores
    // Tratamos erros individualmente para nunca falhar a requisição do usuário
    const dispatches = this.adapters.map(async (adapter) => {
      try {
        await adapter.dispatch(event);
      } catch (err: any) {
        // Log interno de falha de observabilidade sem afetar a resposta principal
        if (process.env.NODE_ENV !== 'test') {
          console.error(
            `[Observability] Falha ao despachar trace para ${adapter.name}:`,
            err?.message ?? err
          );
        }
      }
    });

    await Promise.all(dispatches);
  }
}
