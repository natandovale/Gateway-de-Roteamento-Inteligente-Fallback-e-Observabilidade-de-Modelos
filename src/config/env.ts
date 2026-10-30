import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_PATH: z.string().default('./data/gateway.db'),
  OPENROUTER_API_KEY: z.string().min(1, 'OPENROUTER_API_KEY é obrigatória para a inicialização do gateway'),
  OPENROUTER_BASE_URL: z.string().url().default('https://openrouter.ai/api/v1'),
  DEFAULT_ROUTING_STRATEGY: z.enum(['price', 'latency', 'throughput']).default('price'),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  LANGFUSE_PUBLIC_KEY: z.string().optional(),
  LANGFUSE_SECRET_KEY: z.string().optional(),
  LANGFUSE_BASEURL: z.string().url().default('https://cloud.langfuse.com'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function loadEnv(env: NodeJS.ProcessEnv = process.env): EnvConfig {
  const result = envSchema.safeParse(env);

  if (!result.success) {
    const errorDetails = result.error.issues
      .map((e) => `[${e.path.join('.')}]: ${e.message}`)
      .join(', ');
    throw new Error(`Falha estrita na validação das variáveis de ambiente: ${errorDetails}`);
  }

  return result.data;
}
