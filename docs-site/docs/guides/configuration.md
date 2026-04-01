---
sidebar_position: 1
title: Configuration
---

# Configuration

Legible's configuration is split between environment variables (`.env`) and a YAML configuration file (`config.yaml`).

## Environment Variables

The primary configuration file is `docker/.env`. Key variables:

### LLM API Keys

```bash
# Google Gemini (recommended)
GEMINI_API_KEY=your-key

# OpenAI
OPENAI_API_KEY=your-key

# Anthropic
ANTHROPIC_API_KEY=your-key
```

### Service Ports

```bash
HOST_PORT=3000                    # Wren UI
AI_SERVICE_FORWARD_PORT=5555     # AI Service
MCP_SERVER_PORT=9000              # MCP Server
MCP_WEB_UI_PORT=9001              # MCP Web UI
```

### Engine Configuration

```bash
WREN_ENGINE_PORT=8080
IBIS_SERVER_PORT=8000
EXPERIMENTAL_ENGINE_RUST_VERSION=v3  # Use Rust engine
```

## AI Service Configuration (config.yaml)

The `docker/config.yaml` file configures the AI pipeline in detail.

### LLM Provider

```yaml
type: llm
provider: litellm_llm
models:
  - model: gemini/gemini-2.5-flash
    kwargs:
      temperature: 0
      max_tokens: 4096
```

Supported providers and models:
- **Google Gemini**: `gemini/gemini-2.5-flash`, `gemini/gemini-2.0-pro`
- **OpenAI**: `gpt-4o`, `gpt-4o-mini`
- **Anthropic**: `anthropic/claude-sonnet-4-20250514`
- **Ollama** (local): `ollama/llama3`, `ollama/mistral`

### Embedder

```yaml
type: embedder
provider: openai_embedder
models:
  - model: BAAI/bge-base-en-v1.5
    dimension: 768
api_base: http://text-embeddings-inference:8081
timeout: 120
```

The default setup uses a self-hosted embedding model (BGE-base-en-v1.5) via the Infinity container. No external API key is needed for embeddings.

### Document Store

```yaml
type: document_store
provider: qdrant
location: http://qdrant:6333
```

### Engine

```yaml
type: engine
provider: wren_ui
endpoint: http://legible-ui:3000
```

### Pipeline Configuration

Each AI pipeline can be configured with specific model assignments:

```yaml
type: pipeline
pipes:
  - name: sql_generation
    llm: litellm_llm.gemini/gemini-2.5-flash
    embedder: openai_embedder.BAAI/bge-base-en-v1.5
    engine: wren_ui
    document_store: qdrant
```

### Settings

```yaml
settings:
  host: 0.0.0.0
  port: 5555
  column_indexing_batch_size: 50
  table_retrieval_size: 10
  table_column_retrieval_size: 1000
  query_cache_maxsize: 1000000
  query_cache_ttl: 120
  logging_level: INFO
```

## Custom LLM Setup

To use a different LLM provider:

1. Edit `docker/config.yaml` with the new provider configuration
2. Set the corresponding API key in `docker/.env`
3. Restart the AI service:

```bash
cd docker
docker compose up -d --force-recreate wren-ai-service
```

For Ollama (fully local, no API key needed):

```yaml
type: llm
provider: litellm_llm
models:
  - model: ollama/llama3
    kwargs: {}
api_base: http://host.docker.internal:11434
```
