# Project Progress

## Current Status

- **Status:** DEVELOPMENT
- **Last Update:** 2026-10-30
- **Current Milestone:** Milestone 5 — Endpoint HTTP OpenAI-Compatible (`POST /v1/chat/completions`)

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
- [x] **Milestone 4 — Integração OpenRouter & Execução de Completions com Fallback Ativo:**
  - Cliente HTTP upstream resiliente (`OpenRouterClient`) com timeout parametrizável via `AbortController` e tratamento de erros retryable (429, 5xx, timeouts).
  - Serviço de orquestração (`ExecutionService`) que executa a tentativa no modelo primário, comuta de forma transparente para a cadeia de fallback em caso de falha temporária e audita detalhadamente no SQLite cada requisição com custos e tokens.
  - Cobertura de testes unitários com 100% de sucesso.

## In Progress

- [ ] Milestone 5: Endpoint HTTP OpenAI-Compatible (`POST /v1/chat/completions`).

## Pending

- [ ] Milestone 6: Observabilidade com Langfuse / OTel & Evaluation Tests.

## Tests & Validation

- Test Runner: `node:test` + `node:assert/strict` (23/23 testes passando)
- Typecheck: `tsc --noEmit` (0 erros)
- Status: PASSED

## Known Issues

- Nenhum no momento.

## Technical Debt

- Nenhum no momento.

## Pending Decisions

- Nenhuma pendência no momento.

## Next Steps

1. Iniciar o **Milestone 5**: Criar o schema de validação Zod para requisições de chat completions (`src/infrastructure/http/schemas/chat-completions.ts`).
2. Criar a rota `POST /v1/chat/completions` no Fastify conectando o `RoutePlanner` e o `ExecutionService`, retornando o payload padrão OpenAI e os headers `x-gateway-*`.
3. Validar via testes de integração com `fastify.inject()`.

## Last Completed Increment

- **Description:** Implementação do cliente OpenRouter com timeout via AbortController e do ExecutionService orquestrando tentativas, fallback resiliente e auditoria no SQLite.
- **Files affected:** `src/infrastructure/providers/openrouter-client.ts`, `src/services/execution-service.ts`, `tests/unit/providers/openrouter-client.test.ts`, `tests/unit/services/execution-service.test.ts`.
- **Validation:** 23 testes automatizados executados e passando com sucesso; checagem estrita de tipos sem erros.





