#!/bin/bash
# Start vLLM model server for DeepAnalyze local inference
set -e

MODEL_PATH="${DEEPANALYZE_MODEL_PATH:-/models/DeepAnalyze-8B}"
MODEL_NAME="${DEEPANALYZE_MODEL_NAME:-DeepAnalyze-8B}"
MAX_MODEL_LEN="${DEEPANALYZE_MAX_MODEL_LEN:-49152}"
PORT="${DEEPANALYZE_VLLM_PORT:-8000}"
GPU_UTILIZATION="${DEEPANALYZE_GPU_UTILIZATION:-0.95}"

if [ ! -d "$MODEL_PATH" ]; then
    echo "Error: Model not found at ${MODEL_PATH}"
    echo ""
    echo "Download the model first:"
    echo "  huggingface-cli download RUC-DataLab/DeepAnalyze-8B --local-dir /models/DeepAnalyze-8B"
    echo ""
    echo "Or mount a volume with the model weights:"
    echo "  --volume /path/to/models:/models"
    exit 1
fi

echo "Starting vLLM server..."
echo "  Model:         ${MODEL_PATH}"
echo "  Served as:     ${MODEL_NAME}"
echo "  Max model len: ${MAX_MODEL_LEN}"
echo "  Port:          ${PORT}"
echo ""

python3 -m vllm.entrypoints.openai.api_server \
    --model "$MODEL_PATH" \
    --served-model-name "$MODEL_NAME" \
    --max-model-len "$MAX_MODEL_LEN" \
    --gpu-memory-utilization "$GPU_UTILIZATION" \
    --port "$PORT" \
    --trust-remote-code
