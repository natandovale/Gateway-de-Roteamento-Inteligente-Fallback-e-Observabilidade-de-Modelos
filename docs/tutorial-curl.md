# Tutorial de Testes via cURL

Este guia orienta como executar requisições de teste no **Gateway de Roteamento Inteligente, Fallback e Observabilidade de Modelos** utilizando cURL diretamente no terminal ou através do script utilitário [scripts/test-request.sh](file:///home/user/%C3%81rea%20de%20trabalho/temp/Projetos/Gateway%20de%20Roteamento%20Inteligente,%20Fallback%20e%20Observabilidade%20de%20Modelos/scripts/test-request.sh).

---

## 1. Pré-requisito: Subir o Servidor

Antes de realizar as chamadas, certifique-se de que o servidor do Gateway está em execução:

```bash
# 1. Configurar variáveis no .env (se ainda não fez)
cp .env.example .env

# 2. Iniciar o gateway com suporte a TypeScript nativo do Node 24
npm run dev
```

O servidor informará no terminal que está pronto:
```text
[Gateway] Servidor ativo em http://0.0.0.0:3000
[Gateway] Ambiente: development | Estratégia Padrão: price
```

---

## 2. Forma Rápida: Usando o Script `scripts/test-request.sh`

Criamos um script interativo pronto para uso na pasta `scripts/`.

### Uso Básico (Estratégia Padrão: Preço)

```bash
./scripts/test-request.sh
```

### Uso Customizado (Passando Parâmetros)

O script aceita 3 parâmetros posicionais:
`./scripts/test-request.sh [estrategia] [modelo] "[pergunta/prompt]"`

#### Exemplos:

1. **Testando Roteamento por Menor Latência:**
```bash
./scripts/test-request.sh latency gateway/auto-fast "Qual é a velocidade da luz?"
```

2. **Testando Roteamento por Throughput (vazão de tokens/s):**
```bash
./scripts/test-request.sh throughput gateway/auto-throughput "Liste 3 princípios do Extreme Programming."
```

3. **Testando Modelo Específico:**
```bash
./scripts/test-request.sh price openai/gpt-4o-mini "Escreva um haicai sobre inteligência artificial."
```

---

## 3. Comandos cURL Manuais

Se preferir rodar os comandos cURL puros sem o script:

### 3.1. Health Check
Verifica se o servidor e as conexões estão saudáveis:

```bash
curl -i http://localhost:3000/health
```

**Resposta esperada (HTTP 200):**
```json
{
  "status": "ok",
  "timestamp": "2026-10-31T03:00:00.000Z",
  "env": "development"
}
```

---

### 3.2. Chat Completion com Roteamento por Menor Preço (`price`)

```bash
curl -i -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-routing-strategy: price" \
  -d '{
    "model": "gateway/auto-cheap",
    "messages": [
      {
        "role": "user",
        "content": "Explique o que é Clean Architecture em um parágrafo."
      }
    ],
    "temperature": 0.7
  }'
```

---

### 3.3. Chat Completion com Roteamento por Latência (`latency`)

```bash
curl -i -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-routing-strategy: latency" \
  -d '{
    "model": "gateway/auto-fast",
    "messages": [
      {
        "role": "user",
        "content": "Responda apenas SIM ou NÃO: O céu é azul?"
      }
    ]
  }'
```

---

### 3.4. Teste de Validação de Erro (Fail-Fast na Borda)

Envie uma requisição sem o campo obrigatório `messages` para ver o formato oficial de erro da OpenAI:

```bash
curl -i -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openai/gpt-4o-mini"
  }'
```

**Resposta esperada (HTTP 400):**
```json
{
  "error": {
    "message": "[messages]: Required",
    "type": "invalid_request_error",
    "code": 400
  }
}
```

---

## 4. Como Interpretar os Headers HTTP Retornados pelo Gateway

A grande vantagem deste Gateway é que a resposta do corpo é 100% idêntica à da OpenAI, enquanto toda a inteligência e observabilidade são expostas nos **Headers de Resposta**:

| Header HTTP | Significado | Exemplo |
|---|---|---|
| `x-gateway-strategy` | Estratégia de ranqueamento que foi aplicada | `price` |
| `x-gateway-model-requested` | O modelo ou alias requisitado pelo cliente | `gateway/auto-cheap` |
| `x-gateway-model-executed` | O modelo que efetivamente processou a resposta | `meta-llama/llama-3.1-8b-instruct` |
| `x-gateway-fallback-triggered` | Indica se o modelo primário falhou e houve fallback | `false` ou `true` |
| `x-gateway-fallback-attempts` | Número de tentativas antes do sucesso | `0` |
| `x-gateway-cost-usd` | Custo financeiro exato calculado para os tokens gastos | `0.000004` |
| `x-gateway-latency-ms` | Tempo total de execução do modelo em milissegundos | `482` |
