export interface OpenRouterClientOptions {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface ChatCompletionChoice {
  index: number;
  message: ChatMessage;
  finish_reason: string;
}

export interface ChatCompletionUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage?: ChatCompletionUsage;
}

export class OpenRouterError extends Error {
  public statusCode?: number;
  public isRetryable: boolean;
  public isTimeout: boolean;

  constructor(
    message: string,
    options?: { statusCode?: number; isRetryable?: boolean; isTimeout?: boolean }
  ) {
    super(message);
    this.name = 'OpenRouterError';
    this.statusCode = options?.statusCode;
    this.isRetryable = options?.isRetryable ?? false;
    this.isTimeout = options?.isTimeout ?? false;
  }
}

export class OpenRouterClient {
  private apiKey: string;
  private baseUrl: string;
  private timeoutMs: number;
  private fetchFn: typeof fetch;

  constructor(options: OpenRouterClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? 'https://openrouter.ai/api/v1').replace(/\/$/, '');
    this.timeoutMs = options.timeoutMs ?? 15000;
    this.fetchFn = options.fetchFn ?? fetch;
  }

  public async createChatCompletion(
    payload: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    const url = `${this.baseUrl}/chat/completions`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchFn(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://github.com/gateway-roteamento-modelos',
          'X-Title': 'Smart LLM Gateway',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch {
          // ignore parsing error
        }

        const errorMessage =
          errorData?.error?.message ?? `Erro HTTP ${response.status} do OpenRouter`;
        const statusCode = response.status;
        const isRetryable = statusCode === 429 || statusCode >= 500;

        throw new OpenRouterError(errorMessage, {
          statusCode,
          isRetryable,
        });
      }

      const data = (await response.json()) as ChatCompletionResponse;
      return data;
    } catch (err: any) {
      if (err instanceof OpenRouterError) {
        throw err;
      }

      if (err.name === 'AbortError') {
        throw new OpenRouterError(`Requisição excedeu o timeout de ${this.timeoutMs}ms`, {
          isTimeout: true,
          isRetryable: true,
        });
      }

      // Falha de rede genérica (fetch failed) também é retryable
      throw new OpenRouterError(`Falha de conexão: ${err.message}`, {
        isRetryable: true,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
