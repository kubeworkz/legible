#!/bin/bash
# DeepAnalyze sandbox entrypoint
# Configures Legible CLI credentials and starts WebUI v2 services

set -e

echo "=== DeepAnalyze Sandbox ==="
echo "Configuring environment..."

# Configure Legible CLI if credentials are passed via environment
if [ -n "$LEGIBLE_ENDPOINT" ] && [ -n "$LEGIBLE_API_KEY" ]; then
    mkdir -p ~/.legible
    cat > ~/.legible/config.yaml <<EOF
endpoint: ${LEGIBLE_ENDPOINT}
api_key: ${LEGIBLE_API_KEY}
project_id: "${LEGIBLE_PROJECT_ID:-}"
EOF
    echo "Legible CLI configured → ${LEGIBLE_ENDPOINT}"
fi

# Configure inference endpoint for DeepAnalyze WebUI
if [ -n "$INFERENCE_ENDPOINT" ]; then
    # Update .env with the inference endpoint
    ENV_FILE="/opt/deepanalyze/repo/demo/chat_v2/.env"
    if [ -f "$ENV_FILE" ]; then
        sed -i "s|^DEEPANALYZE_EXECUTION_MODE=.*|DEEPANALYZE_EXECUTION_MODE=${DEEPANALYZE_EXECUTION_MODE:-local}|" "$ENV_FILE"
    fi
    echo "Inference endpoint: ${INFERENCE_ENDPOINT}"
fi

# Auto-start WebUI v2 if DEEPANALYZE_AUTOSTART is set
if [ "${DEEPANALYZE_AUTOSTART:-false}" = "true" ]; then
    echo "Auto-starting WebUI v2..."
    /opt/deepanalyze/start-webui.sh &
    sleep 3
    echo "WebUI v2 ready at http://localhost:4000"
fi

echo ""
echo "Available commands:"
echo "  /opt/deepanalyze/start-webui.sh  — Start WebUI v2 (frontend + backend)"
echo "  /opt/deepanalyze/start-vllm.sh   — Start local vLLM model server (GPU required)"
echo "  legible ask \"...\"                 — Query via Legible semantic layer"
echo ""

# Execute the command (default: /bin/bash)
exec "$@"
