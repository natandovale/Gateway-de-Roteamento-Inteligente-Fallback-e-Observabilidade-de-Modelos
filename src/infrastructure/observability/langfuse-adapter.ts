import crypto from 'node:crypto';
import type { IObservabilityAdapter, TraceEvent } from './observability-dispatcher.ts';

export interface LangfuseConfig {
  publicKey?: string;
  secretKey?: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
}

export class LangfuseAdapter implements IObservabilityAdapter {
  public name = 'LangfuseAdapter';
  private config: LangfuseConfig;
  private fetchFn: typeof fetch;

  constructor(config: LangfuseConfig) {
    this.config = config;
    this.fetchFn = config.fetchFn ?? fetch;
  }

  public async dispatch(event: TraceEvent): Promise<void> {
    if (!this.config.publicKey || !this.config.secretKey) {
      // Se não configurado, opera em modo no-op silencioso
      return;
    }

    const eventTimeMs = new Date(event.timestamp).getTime();
    const startMs = eventTimeMs - (event.latencyMs || 0);
    const startNano = String(BigInt(Math.max(0, startMs)) * 1_000_000n);
    const endNano = String(BigInt(eventTimeMs) * 1_000_000n);

    // Formato padrão OTLP Trace/Span (16 bytes hex para traceId, 8 bytes hex para spanId)
    const traceId = crypto.randomBytes(16).toString('hex');
    const spanId = crypto.randomBytes(8).toString('hex');

    const otlpPayload = {
      resourceSpans: [
        {
          resource: {
            attributes: [
              { key: 'service.name', value: { stringValue: 'gateway-roteamento-modelos' } },
            ],
          },
          scopeSpans: [
            {
              scope: { name: 'gateway-router', version: '1.0.0' },
              spans: [
                {
                  traceId,
                  spanId,
                  name: `chat-completion-${event.strategy}`,
                  kind: 1, // SPAN_KIND_INTERNAL
                  startTimeUnixNano: startNano,
                  endTimeUnixNano: endNano,
                  attributes: [
                    { key: 'langfuse.type', value: { stringValue: 'generation' } },
                    { key: 'langfuse.observation.type', value: { stringValue: 'generation' } },
                    { key: 'model', value: { stringValue: event.modelExecuted } },
                    { key: 'langfuse.model', value: { stringValue: event.modelExecuted } },
                    { key: 'gen_ai.system', value: { stringValue: 'openrouter' } },
                    { key: 'gen_ai.request.model', value: { stringValue: event.modelRequested } },
                    { key: 'gen_ai.response.model', value: { stringValue: event.modelExecuted } },
                    { key: 'gen_ai.usage.prompt_tokens', value: { intValue: String(event.promptTokens) } },
                    { key: 'gen_ai.usage.completion_tokens', value: { intValue: String(event.completionTokens) } },
                    { key: 'gen_ai.usage.total_tokens', value: { intValue: String(event.totalTokens) } },
                    { key: 'usage.input', value: { intValue: String(event.promptTokens) } },
                    { key: 'usage.output', value: { intValue: String(event.completionTokens) } },
                    { key: 'usage.total', value: { intValue: String(event.totalTokens) } },
                    { key: 'gen_ai.usage.cost', value: { doubleValue: event.costUsd } },
                    { key: 'calculatedTotalCost', value: { doubleValue: event.costUsd } },
                    { key: 'gateway.request_id', value: { stringValue: event.requestId } },
                    { key: 'gateway.strategy', value: { stringValue: event.strategy } },
                    { key: 'gateway.fallback_triggered', value: { boolValue: event.fallbackTriggered } },
                    { key: 'gateway.fallback_attempts', value: { intValue: String(event.fallbackAttempts) } },
                    { key: 'gateway.latency_ms', value: { intValue: String(event.latencyMs) } },
                    { key: 'http.status_code', value: { intValue: String(event.statusCode) } },
                  ],
                  status: { code: event.statusCode >= 400 ? 2 : 1 },
                },
              ],
            },
          ],
        },
      ],
    };

    const baseUrl = this.config.baseUrl?.replace(/\/$/, '') ?? 'https://cloud.langfuse.com';
    const url = `${baseUrl}/api/public/otel/v1/traces`;
    const auth = Buffer.from(`${this.config.publicKey}:${this.config.secretKey}`).toString('base64');

    const response = await this.fetchFn(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
        'x-langfuse-ingestion-version': '4',
      },
      body: JSON.stringify(otlpPayload),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Langfuse OTLP Ingestion falhou com status ${response.status}: ${errText}`);
    }
  }
}
