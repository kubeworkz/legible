---
sidebar_position: 2
title: Installation
---

# Installation

Legible can be deployed via Docker Compose (recommended) or Kubernetes.

## System Requirements

| Requirement | Minimum |
|------------|---------|
| RAM | 8 GB |
| Disk | 20 GB free |
| Docker | 20.10+ with Compose v2 |
| CPU | 2+ cores |

## Docker Compose (Recommended)

### Clone and configure

```bash
git clone https://github.com/kubeworkz/legible.git
cd legible
cp docker/.env.example docker/.env
cp docker/config.example.yaml docker/config.yaml
```

### Edit environment variables

Open `docker/.env` and configure:

```bash
# Required: LLM API key
GEMINI_API_KEY=your-key-here

# Optional: change the UI port (default 3000)
HOST_PORT=3000

# Optional: AI service port (default 5555)
AI_SERVICE_FORWARD_PORT=5555
```

### Build and start

```bash
# Build all images and start services
./start.sh

# Or just start without rebuilding
./start.sh --no-build

# Or just build without starting
./start.sh --build-only

# Restart all services
./start.sh --restart
```

### Verify

Check all containers are running:

```bash
cd docker && docker compose ps
```

You should see 7 services: `bootstrap`, `wren-engine`, `ibis-server`, `wren-ai-service`, `text-embeddings-inference`, `qdrant`, and `legible-ui`.

## Kubernetes

See the [Kubernetes deployment guide](/deployment/kubernetes) for Kustomize-based deployment.

## Updating

To update to the latest version:

```bash
git pull
./start.sh
```

This rebuilds all images with the latest code and restarts services.
