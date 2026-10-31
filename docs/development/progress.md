# Project Progress

## Current Status

- **Status:** DEVELOPMENT
- **Last Update:** 2026-10-29
- **Current Milestone:** Milestone 3 — Core Domain: Estratégias de Roteamento e Fallback

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
  - Testes unitários com 100% de sucesso.

## In Progress

- [ ] Milestone 3: Core Domain — Estratégias de Roteamento (Price, Latency, Throughput) e Motor de Fallback.

## Pending

- [ ] Milestone 4: Integração OpenRouter & Execução de Completions.
- [ ] Milestone 5: Endpoint HTTP OpenAI-Compatible (`POST /v1/chat/completions`).
- [ ] Milestone 6: Observabilidade com Langfuse / OTel & Evaluation Tests.

## Tests & Validation

- Test Runner: `node:test` + `node:assert/strict` (8/8 testes passando)
- Typecheck: `tsc --noEmit` (0 erros)
- Status: PASSED

## Known Issues

- Nenhum no momento.

## Technical Debt

- Nenhum no momento.

## Pending Decisions

- Nenhuma pendência no momento.

## Next Steps

1. Iniciar o **Milestone 3**: Criar as entidades de domínio e as estratégias puras de ordenação de modelos (`PriceStrategy`, `LatencyStrategy`, `ThroughputStrategy`).
2. Implementar a política de seleção com cadeia de fallback e cobertura total via TDD unitário.

## Last Completed Increment

- **Description:** Implementação da camada de persistência com SQLite nativo do Node.js 24 (`node:sqlite`), tabelas de auditoria, métricas e catálogo em cache, com ciclo de vida acoplado ao Fastify.
- **Files affected:** `src/infrastructure/database/sqlite-repository.ts`, `src/infrastructure/http/server.ts`, `tests/unit/database/sqlite-repository.test.ts`.
- **Validation:** 8 testes automatizados executados e passando com sucesso; checagem estrita de tipos sem erros.


