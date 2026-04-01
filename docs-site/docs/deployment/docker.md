---
sidebar_position: 1
title: Docker
---

# Docker Deployment

The recommended way to deploy Legible for production use.

## Prerequisites

- Docker 20.10+ with Docker Compose v2
- 8 GB RAM minimum (16 GB recommended)
- 20 GB disk space

## Quick Deploy

```bash
git clone https://github.com/kubeworkz/legible.git
cd legible
cp docker/.env.example docker/.env
cp docker/config.example.yaml docker/config.yaml

# Edit .env with your API keys and settings
vim docker/.env

# Build and start
./start.sh
```

## Services

The Docker Compose stack includes:

| Service | Image | Memory Limit | Purpose |
|---------|-------|-------------|---------|
| `legible-ui` | `legible-ui:local` | 4 GB | Next.js UI |
| `wren-ai-service` | `wren-ai-service:local` | 4 GB | AI pipeline |
| `ibis-server` | `wren-engine-ibis:local` | — | Query engine + MCP |
| `wren-engine` | `wren-engine:local` | — | Legacy SQL engine |
| `qdrant` | `qdrant/qdrant:v1.11.0` | 2 GB | Vector store |
| `text-embeddings-inference` | `michaelf34/infinity:latest` | 2 GB | Embedding model |
| `bootstrap` | `wren-bootstrap:local` | — | One-shot init |

## Volumes

- `data` — Shared volume for MDL files, SQLite database, Qdrant storage
- `tei-models` — Cached embedding model weights

## Exposed Ports

```bash
HOST_PORT=3000              # Wren UI
AI_SERVICE_FORWARD_PORT=5555 # AI Service API
MCP_SERVER_PORT=9000         # MCP endpoint
MCP_WEB_UI_PORT=9001         # MCP config UI
```

## Rebuilding Individual Services

To rebuild and restart a single service:

```bash
cd docker

# Rebuild legible-ui
DOCKER_BUILDKIT=1 docker build -t legible-ui:local ../legible-ui
docker compose up -d --no-deps --force-recreate legible-ui

# Rebuild AI service
docker build -t wren-ai-service:local -f ../wren-ai-service/docker/Dockerfile ../wren-ai-service
docker compose up -d --no-deps --force-recreate wren-ai-service
```

## Resource Tuning

For smaller machines, reduce memory limits in `docker-compose.yaml`:

```yaml
deploy:
  resources:
    limits:
      memory: 2g  # Reduce from 4g
```

The minimum viable configuration needs about 6 GB RAM total.

## Logs

```bash
cd docker

# All services
docker compose logs -f

# Specific service
docker compose logs -f legible-ui
docker compose logs -f wren-ai-service
```

## Backup

The SQLite database and MDL files are stored in the `data` Docker volume:

```bash
# Backup
docker run --rm -v legible_data:/data -v $(pwd):/backup busybox tar czf /backup/legible-backup.tar.gz /data

# Restore
docker run --rm -v legible_data:/data -v $(pwd):/backup busybox tar xzf /backup/legible-backup.tar.gz -C /
```
