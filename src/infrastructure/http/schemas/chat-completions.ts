import { z } from 'zod';

export const chatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().min(1, 'O conteúdo da mensagem não pode ser vazio'),
});

export const chatCompletionRequestSchema = z.object({
  model: z.string().min(1, 'O modelo é obrigatório'),
  messages: z.array(chatMessageSchema).min(1, 'A lista de messages não pode ser vazia'),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().positive().optional(),
  stream: z.boolean().optional(),
});

export type ChatCompletionRequestBody = z.infer<typeof chatCompletionRequestSchema>;
