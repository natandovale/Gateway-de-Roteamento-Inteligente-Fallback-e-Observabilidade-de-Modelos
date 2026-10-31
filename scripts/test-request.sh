#!/usr/bin/env bash

# ==============================================================================
# Script de Teste cURL para o Gateway Inteligente de Modelos
# Permite testar endpoints de Health Check e Chat Completions com estratégias
# ==============================================================================

GATEWAY_URL="${GATEWAY_URL:-http://localhost:3000}"
STRATEGY="${1:-price}"  # price | latency | throughput
MODEL="${2:-gateway/auto-cheap}"
PROMPT="${3:-Explique em uma frase o que é resiliência de software.}"

echo "========================================================================"
echo "🚀 Testando Gateway em: $GATEWAY_URL"
echo "⚙️  Estratégia: $STRATEGY | Modelo: $MODEL"
echo "💬 Prompt: $PROMPT"
echo "========================================================================"
echo ""

# 1. Teste de Health Check
echo "🔍 1. Verificando Health Check..."
HEALTH_RESP=$(curl -s "$GATEWAY_URL/health")
echo "Resposta Health: $HEALTH_RESP"
echo ""

# 2. Teste de Chat Completion (OpenAI Compatible)
echo "🤖 2. Enviando requisição para POST /v1/chat/completions..."
echo "--- Headers & Resposta do Servidor ---"

curl -i -X POST "$GATEWAY_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "x-routing-strategy: $STRATEGY" \
  -d "{
    \"model\": \"$MODEL\",
    \"messages\": [
      {
        \"role\": \"user\",
        \"content\": \"$PROMPT\"
      }
    ],
    \"temperature\": 0.7
  }"

echo ""
echo ""
echo "========================================================================"
echo "✅ Teste concluído!"
echo "Verifique nos headers acima os campos:"
echo " • x-gateway-strategy"
echo " • x-gateway-model-executed"
echo " • x-gateway-fallback-triggered"
echo " • x-gateway-cost-usd"
echo " • x-gateway-latency-ms"
echo "========================================================================"
