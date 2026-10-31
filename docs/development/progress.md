# Project Progress

## Current Status

- **Status:** COMPLETED
- **Last Update:** 2026-10-30
- **Current Milestone:** Milestone 6 — Observabilidade com Langfuse / OTel & Evaluation Tests (Concluído)

## Completed

- [x] Análise detalhada dos requisitos funcionais e não funcionais.
- [x] Alinhamento e decisões técnicas fundamentais (Padrão OpenAI, Roteamento Dinâmico, SQLite Nativo, Stateful, Monitoramento de Custos).
- [x] Atualização completa e governança do `docs/AGENTS.md`.
- [x] Elaboração do `docs/development/development-plan.md`.
- [x] Bootstrap do ambiente: `package.json`, `tsconfig.json`, `.gitignore`, `.env.example`, `README.md`, dependências instaladas (`fastify`, `zod`, `typescript`, `@types/node`) e validação do runner nativo (`node:test`).
- [x] **Milestone 1 — Configuração Fail-Fast & Servidor HTTP:**
  - Validação estrita de configuração fail-fast (`src/config/env.ts`) com Zod.
  - Servidor Fastify estruturado (`src/infrastructure/http/server.ts`) com rota `GET /health`.
  - Ponto de entrada (`src/index.ts`) com tratamento de erro no boot.
- [x] **Milestone 2 — Persistência Stateful com SQLite Nativo:**
  - Repositório SQLite embutido via `node:sqlite` nativo (`src/infrastructure/database/sqlite-repository.ts`).
  - Criação automática e indexada de tabelas: `requests_log` (auditoria e custos), `model_metrics` (latência e throughput) e `models_cache` (catálogo local).
  - Suporte total a banco em memória (`:memory:`) para isolamento dos testes automatizados e graceful shutdown com hook `onClose` no Fastify.
- [x] **Milestone 3 — Core Domain: Estratégias de Roteamento, Fallback e Custos:**
  - Entidades de domínio (`ModelCandidate`, `RoutePlan`, `RoutingStrategyType`).
  - Estratégias puras: `PriceStrategy`, `LatencyStrategy` e `ThroughputStrategy`.
  - Motor de planejamento de rota e fallback sequencial (`RoutePlanner`).
  - Calculador de custos monetários de tokens (`calculateCostUsd`).
- [x] **Milestone 4 — Integração OpenRouter & Execução com Fallback Ativo:**
  - Cliente HTTP upstream resiliente (`OpenRouterClient`) com timeout parametrizável via `AbortController` e tratamento de erros retryable (429, 5xx, timeouts).
  - Serviço de orquestração (`ExecutionService`) que executa a tentativa no modelo primário, comuta de forma transparente para a cadeia de fallback em caso de falha temporária e audita detalhadamente no SQLite cada requisição com custos e tokens.
- [x] **Milestone 5 — Endpoint HTTP OpenAI-Compatible (`POST /v1/chat/completions`):**
  - Schema de validação Zod para payloads de chat completions (`src/infrastructure/http/schemas/chat-completions.ts`).
  - Rota `POST /v1/chat/completions` com suporte a estratégia de roteamento dinâmica via header `x-routing-strategy`.
  - Resposta estritamente compatível com o formato OpenAI e enriquecida com os headers `x-gateway-*`.
- [x] **Milestone 6 — Observabilidade com Langfuse / OTel & Evaluation Tests:**
  - `ObservabilityDispatcher` (`src/infrastructure/observability/observability-dispatcher.ts`) desacoplado e resiliente a falhas externas de monitoramento.
  - `LangfuseAdapter` (`src/infrastructure/observability/langfuse-adapter.ts`) para envio assíncrono de traces, gerações e custos calculados.
  - Avaliador automatizado de prompts `PromptEvaluator` (`src/core/evals/prompt-evaluator.ts`) e suíte de testes de avaliação de prompts em `tests/evals/prompt-evaluator.test.ts`.

## In Progress

- [ ] Nenhuma tarefa em andamento. Todos os marcos planejados foram concluídos com sucesso.

## Pending

- [ ] Nenhuma pendência funcional. O produto atende a 100% do escopo aprovado no AGENTS.md.

## Tests & Validation

- Test Runner: `node:test` + `node:assert/strict` (30/30 testes passando)
- Typecheck: `tsc --noEmit` (0 erros)
- Status: PASSED

## Known Issues

- Nenhum no momento.

## Technical Debt

- Nenhum no momento.

## Pending Decisions

- Nenhuma pendência no momento.

## Next Steps

1. Commit final do Milestone 6 no Git.
2. Demonstração de uso e encerramento do ciclo de Pair Programming.

## Last Completed Increment

- **Description:** Implementação do despachante de observabilidade (Langfuse e OTel), integração no ExecutionService e criação do PromptEvaluator com suíte de Evaluation Tests automatizados.
- **Files affected:** `src/infrastructure/observability/observability-dispatcher.ts`, `src/infrastructure/observability/langfuse-adapter.ts`, `src/core/evals/prompt-evaluator.ts`, `src/services/execution-service.ts`, `tests/unit/observability/observability-dispatcher.test.ts`, `tests/evals/prompt-evaluator.test.ts`.
- **Validation:** 30 testes automatizados executados e passando com sucesso; checagem estrita de tipos sem erros.







