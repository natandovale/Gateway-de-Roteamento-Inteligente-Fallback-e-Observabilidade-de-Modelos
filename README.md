# Gateway de Roteamento Inteligente, Fallback e Observabilidade de Modelos

Gateway HTTP de alto desempenho construído com Node.js 24 (TypeScript nativo) e Fastify, intermediando o acesso a múltiplos modelos de linguagem (LLMs) via OpenRouter com base em critérios operacionais (Preço, Latência ou Throughput), fallback automático e observabilidade profunda.

---

## Características Principais

- **Compatibilidade com OpenAI:** Endpoint `POST /v1/chat/completions` consumível diretamente por SDKs OpenAI (`openai-python`, `openai-node`, cURL).
- **Roteamento Dinâmico:** Escolha inteligente do modelo ótimo segundo a estratégia:
  - `price`: Menor custo financeiro por milhão de tokens.
  - `latency`: Menor tempo de resposta médio histórico.
  - `throughput`: Maior vazão de tokens por segundo.
- **Fallback Automático:** Resiliência transparente contra erros 429 (Rate Limit), 5xx (Server Error) ou timeouts configuráveis.
- **Persistência Stateful com SQLite Nativo:** Auditoria de custos, log de transações e métricas acumuladas persistidas via `node:sqlite` (Node.js 24 built-in, sem dependência de banco externo).
- **Observabilidade:** Instrumentação com Langfuse (custos e traces) e OpenTelemetry (métricas OTLP e APM).
- **Fail-Fast:** Validação rigorosa de variáveis de ambiente com Zod no boot.

---

## Pré-requisitos

- Node.js 24 LTS ou superior
- NPM 11 ou superior

---

## Instalação e Execução

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Preencha sua OPENROUTER_API_KEY no arquivo .env

# 3. Executar em modo desenvolvimento (com watch e TypeScript nativo)
npm run dev

# 4. Executar suíte de testes (Node.js Test Runner)
npm test

# 5. Checagem de tipos estáticos
# 6. Testes Rápidos via cURL
./scripts/test-request.sh price gateway/auto-cheap "Explique o conceito de Fail-Fast."
```

---

## Governança, Tutoriais e Arquitetura

As diretrizes técnicas, regras de Extreme Programming (XP), tutoriais e histórico de progresso estão documentados na pasta `docs/`:

- [AGENTS.md](docs/AGENTS.md) — Documento central de arquitetura, fluxo e governança.
- [docs/tutorial-curl.md](docs/tutorial-curl.md) — Tutorial detalhado de execução de testes via cURL.
- [docs/development/development-plan.md](docs/development/development-plan.md) — Plano incremental de desenvolvimento.
- [docs/development/progress.md](docs/development/progress.md) — Registro de progresso contínuo.
- [docs/architecture/decisions/](docs/architecture/decisions/) — Architecture Decision Records (ADRs).

