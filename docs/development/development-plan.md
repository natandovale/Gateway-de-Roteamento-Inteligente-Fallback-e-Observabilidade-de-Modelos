# Plano de Desenvolvimento — Gateway de Roteamento Inteligente

Este documento detalha o planejamento das entregas utilizando Extreme Programming (XP), Small Releases e Test-Driven Development (TDD).

---

## Marcos (Milestones)

### Milestone 1: Bootstrap & Configuração Segura (Fail-Fast)
- **Foco:** Configuração inicial de ambiente, TypeScript nativo no Node.js 24, validação estrita com Zod e servidor Fastify básico com health check.
- **Entregáveis:**
  - `package.json`, `tsconfig.json`, `.env.example`, `.gitignore`.
  - Config loader `src/config/env.ts` com testes unitários.
  - Servidor Fastify inicial com endpoint `GET /health`.

### Milestone 2: Persistência Stateful com SQLite Nativo
- **Foco:** Criação do banco SQLite embutido via `node:sqlite`, migrations/schemas e repositório de métricas e auditoria.
- **Entregáveis:**
  - `src/infrastructure/database/sqlite-client.ts`.
  - Tabelas: `requests_log`, `model_metrics`, `models_cache`.
  - Repositório com suporte a banco em memória (`:memory:`) para testes.

### Milestone 3: Core Domain — Estratégias de Roteamento e Fallback
- **Foco:** Regras puras de ordenação de modelos e tolerância a falhas.
- **Entregáveis:**
  - Entidades de domínio (`Model`, `RoutingCriteria`, `RoutePlan`).
  - Estratégias: `PriceStrategy`, `LatencyStrategy`, `ThroughputStrategy`.
  - Motor de Fallback (sequenciamento em caso de 429, 5xx e Timeout).
  - Cobertura 100% em testes unitários via `node:test`.

### Milestone 4: Integração OpenRouter & Execução de Completions
- **Foco:** Cliente HTTP upstream e orquestrador de execução com timeouts e fallback ativo.
- **Entregáveis:**
  - Cliente de integração OpenRouter com timeout.
  - `ExecutionService` coordenando chamada ao modelo e fallback se necessário.
  - Registro de auditoria no SQLite a cada chamada.

### Milestone 5: Endpoint HTTP OpenAI-Compatible (`POST /v1/chat/completions`)
- **Foco:** Exposição da API para consumo externo via SDK OpenAI / cURL.
- **Entregáveis:**
  - Schema de validação Zod para payload OpenAI de chat completions.
  - Handler e Controller mapeando a requisição para o `ExecutionService`.
  - Retorno no formato oficial OpenAI com headers de resposta `x-gateway-*`.
  - Testes de integração usando `fastify.inject`.

### Milestone 6: Observabilidade & Evaluation Tests
- **Foco:** Instrumentação de traces e métricas com Langfuse / OpenTelemetry e testes de avaliação de prompts.
- **Entregáveis:**
  - Adaptador de observabilidade (Langfuse spans / generations e contagem de tokens).
  - Exportação de métricas OTel de latência e taxa de erros.
  - Suíte de Evaluation Tests (`tests/evals/`) para validar respostas de prompts contra critérios objetivos.
