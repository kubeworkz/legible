# DeepAnalyze OpenShell Sandbox
#
# Multi-stage build:
#   Stage 1: Build Next.js frontend
#   Stage 2: Runtime with Python + Node + vLLM + WebUI v2
#
# Base: NVIDIA CUDA 12.1 (GPU support for vLLM local model serving)
# Fallback: Works CPU-only with external API endpoints

# ---- Stage 1: Build frontend ----
FROM node:20-slim AS frontend-builder

WORKDIR /build
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

RUN git clone --depth 1 https://github.com/ruc-datalab/DeepAnalyze.git /build/deepanalyze
WORKDIR /build/deepanalyze/demo/chat_v2/frontend
RUN npm install && npm run build

# ---- Stage 2: Runtime ----
FROM nvidia/cuda:12.1.0-devel-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /opt/deepanalyze

# System dependencies
RUN apt-get update && apt-get install -y \
    python3 python3-pip python3-dev python3-venv \
    git curl wget vim jq lsof \
    ca-certificates \
    nodejs npm \
    pandoc texlive-xetex texlive-fonts-recommended \
    && rm -rf /var/lib/apt/lists/*

# Python: DeepAnalyze inference requirements
RUN pip3 install --upgrade pip && \
    pip3 install \
    "vllm>=0.8.5" \
    numpy pandas openpyxl scikit-learn seaborn \
    torch transformers matplotlib plotly statsmodels \
    requests websockets python-multipart uvicorn fastapi openai pypandoc

# Python: Extended data science stack (matches upstream docker/Dockerfile)
RUN pip3 install \
    accelerate pandasql pyjanitor feature-engine missingno \
    bokeh squarify wordcloud \
    mlxtend imbalanced-learn optuna shap lime \
    prophet pmdarima tslearn lifelines

# Clone DeepAnalyze repo
RUN git clone --depth 1 https://github.com/ruc-datalab/DeepAnalyze.git /opt/deepanalyze/repo

# Copy pre-built frontend from stage 1
COPY --from=frontend-builder /build/deepanalyze/demo/chat_v2/frontend/.next /opt/deepanalyze/repo/demo/chat_v2/frontend/.next
COPY --from=frontend-builder /build/deepanalyze/demo/chat_v2/frontend/node_modules /opt/deepanalyze/repo/demo/chat_v2/frontend/node_modules
COPY --from=frontend-builder /build/deepanalyze/demo/chat_v2/frontend/package.json /opt/deepanalyze/repo/demo/chat_v2/frontend/package.json

# Create default .env for WebUI v2
RUN cp /opt/deepanalyze/repo/demo/chat_v2/.env.example /opt/deepanalyze/repo/demo/chat_v2/.env

# Copy startup scripts
COPY entrypoint.sh /opt/deepanalyze/entrypoint.sh
COPY start-webui.sh /opt/deepanalyze/start-webui.sh
COPY start-vllm.sh /opt/deepanalyze/start-vllm.sh
RUN chmod +x /opt/deepanalyze/entrypoint.sh \
    /opt/deepanalyze/start-webui.sh \
    /opt/deepanalyze/start-vllm.sh

# Create sandbox user and workspace
RUN useradd -m -s /bin/bash sandbox && \
    mkdir -p /workspace /models && \
    chown -R sandbox:sandbox /workspace /models /opt/deepanalyze

# Expose ports
EXPOSE 4000 8200 8100 8000 9000

USER sandbox
WORKDIR /workspace

ENTRYPOINT ["/opt/deepanalyze/entrypoint.sh"]
CMD ["/bin/bash"]
