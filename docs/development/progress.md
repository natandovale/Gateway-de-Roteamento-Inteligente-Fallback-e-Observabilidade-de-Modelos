# Project Progress

## Current Status

- **Status:** DEVELOPMENT
- **Last Update:** 2026-10-30
- **Current Milestone:** Milestone 4 — Integração OpenRouter & Execução com Fallback

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
  - Cobertura 100% em testes unitários.

## In Progress

- [ ] Milestone 4: Integração OpenRouter & Execução de Completions com Fallback Ativo.

## Pending

- [ ] Milestone 5: Endpoint HTTP OpenAI-Compatible (`POST /v1/chat/completions`).
- [ ] Milestone 6: Observabilidade com Langfuse / OTel & Evaluation Tests.

## Tests & Validation

- Test Runner: `node:test` + `node:assert/strict` (17/17 testes passando)
- Typecheck: `tsc --noEmit` (0 erros)
- Status: PASSED

## Known Issues

- Nenhum no momento.

## Technical Debt

- Nenhum no momento.

## Pending Decisions

- Nenhuma pendência no momento.

## Next Steps

1. Iniciar o **Milestone 4**: Desenvolver o cliente de integração com o OpenRouter (`OpenRouterClient`) com suporte a timeout e mock nos testes.
2. Implementar o `ExecutionService`, orquestrando a tentativa no modelo primário e a transição transparente para a cadeia de fallback em caso de erros elegíveis (429, 5xx, timeout), registrando a auditoria no SQLite.

## Last Completed Increment

- **Description:** Implementação das estratégias de roteamento puro (Preço, Latência, Throughput), motor de planejamento de rota com fallback (RoutePlanner) e cálculo de custos em USD.
- **Files affected:** `src/core/entities/model-candidate.ts`, `src/core/entities/cost-calculator.ts`, `src/core/strategies/price-strategy.ts`, `src/core/strategies/latency-strategy.ts`, `src/core/strategies/throughput-strategy.ts`, `src/core/strategies/route-planner.ts`, `tests/unit/core/routing-strategies.test.ts`, `tests/unit/core/cost-calculator.test.ts`.
- **Validation:** 17 testes automatizados executados e passando com sucesso; checagem estrita de tipos sem erros.



