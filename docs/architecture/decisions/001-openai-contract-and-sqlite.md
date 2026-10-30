# ADR 001: Adoção do Contrato OpenAI, Persistência com SQLite Nativo e Roteamento Dinâmico

- **Status:** Aprovado
- **Data:** 2026-10-29
- **Decisores:** Desenvolvedor & AI Pair Programmer

## Contexto

O projeto consiste na criação de um Gateway Inteligente de Modelos de Linguagem (LLMs) em Node.js/TypeScript, intermediando chamadas ao OpenRouter com seleção dinâmica de modelos (por preço, latência ou throughput), fallback automático em caso de indisponibilidade/erros e observabilidade de custos e performance.

Era necessário decidir:
1. O formato do contrato de comunicação com clientes consumidores.
2. A estratégia de persistência e gerenciamento de estado (Stateful vs. Stateless).
3. O mecanismo de seleção e ranqueamento de modelos.

## Decisões Tomadas

1. **Contrato de API OpenAI-Compatible (`POST /v1/chat/completions`):**
   - O corpo da resposta seguirá estritamente a especificação oficial da OpenAI (`id`, `choices`, `usage`, etc.).
   - Os metadados operacionais e analíticos exclusivos do Gateway (`strategy`, `model_requested`, `model_executed`, `fallback_triggered`, `cost_usd`, `latency_ms`) trafegarão nos headers HTTP de resposta (`x-gateway-*`).
2. **Persistência Stateful com SQLite Nativo (`node:sqlite`):**
   - A aplicação será stateful, persistindo histórico de requisições, custos e métricas móveis de latência/throughput.
   - Adotou-se o módulo nativo `node:sqlite` embutido no Node.js 24 LTS, eliminando dependências de servidores de banco externos (PostgreSQL/Redis) e mantendo a simplicidade de operação (*Simple Design*).
   - Suporte a banco em memória (`:memory:`) transparente para execução rápida e isolada de testes automatizados.
3. **Roteamento Dinâmico:**
   - Preços baseados no catálogo sincronizado do OpenRouter.
   - Latência e Throughput baseados em métricas históricas reais acumuladas no SQLite.

## Alternativas Consideradas

- **Contrato REST proprietário:** Rejeitado para evitar atrito de adoção e permitir que SDKs existentes apontem para o Gateway apenas alterando a `baseURL`.
- **Arquitetura 100% Stateless:** Rejeitada a favor de uma aplicação stateful capaz de auditar custos e manter métricas históricas de latência localmente sem depender exclusivamente de coletores analíticos externos.
- **PostgreSQL / Redis externo:** Rejeitado neste momento para evitar complexidade operacional desnecessária (*overengineering*), mantendo a entrega enxuta e autônoma.

## Consequências

- **Positivas:** Interoperabilidade imediata com o ecossistema OpenAI; persistência ACID leve e sem infraestrutura externa; métricas de roteamento precisas baseadas no histórico local.
- **Atenção:** Em deploys com múltiplas réplicas em contêineres efêmeros, no futuro poderá ser avaliada uma replicação de banco (ex.: LiteFS ou banco centralizado) se houver necessidade de escala horizontal distribuída.
