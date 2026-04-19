# Wren Engine File Inventory

Complete list of files that may need changes during a wren-engine upgrade, grouped by layer.

## Layer 1: Git Submodule

| File | Purpose |
|------|---------|
| `.gitmodules` | Submodule URL definition (`git@github.com:Canner/wren-engine.git`) |
| `wren-engine/` | Submodule checkout — update to target commit/tag |

## Layer 2: Docker Compose — Production

| File | Key Sections |
|------|-------------|
| `docker/docker-compose.yaml` | `wren-engine` service (image: `wren-engine:local`, ports 8080/7432), `ibis-server` service (image: `wren-engine-ibis:local`, ports 8000/9000/9001), `legible-ui` environment (`WREN_ENGINE_ENDPOINT`, `IBIS_SERVER_ENDPOINT`, `WREN_ENGINE_VERSION`) |

## Layer 3: Docker Compose — Dev

| File | Key Sections |
|------|-------------|
| `docker/docker-compose-dev.yaml` | `wren-engine` service (image: `ghcr.io/canner/wren-engine:${WREN_ENGINE_VERSION}`), `ibis-server` service (image: `ghcr.io/canner/wren-engine-ibis:${IBIS_SERVER_VERSION}`) |
| `wren-ai-service/tools/dev/docker-compose-dev.yaml` | `wren-engine` service (same GHCR image), `ibis-server` service (same GHCR image), `WREN_ENGINE_ENDPOINT`, `IBIS_SERVER_ENDPOINT` |

## Layer 4: Build Script

| File | Key Sections |
|------|-------------|
| `start.sh` | `build_images()` function — builds `wren-engine:local` from `wren-engine/wren-core-legacy/docker/Dockerfile` and `wren-engine-ibis:local` from `wren-engine/ibis-server/Dockerfile` |

## Layer 5: Kubernetes Manifests

| File | Key Elements |
|------|-------------|
| `deployment/kustomizations/kustomization.yaml` | `images[].newTag` for `ghcr.io/canner/wren-engine` and `ghcr.io/canner/wren-engine-ibis` |
| `deployment/kustomizations/base/deploy-wren-engine.yaml` | Deployment spec: container image, ports (8080, 7432), volume mounts, init container (bootstrap) |
| `deployment/kustomizations/base/deploy-wren-ibis-server.yaml` | Deployment spec: container image, ports (8000), env vars (`WREN_ENGINE_ENDPOINT`, `LOGGING_LEVEL`) |
| `deployment/kustomizations/base/cm.yaml` | ConfigMap: `WREN_ENGINE_ENDPOINT` (`http://wren-engine-svc:8080`), `IBIS_SERVER_ENDPOINT` (`http://wren-ibis-server-svc:8000`), `WREN_ENGINE_VERSION`, `wren_ibis` engine provider config |
| `deployment/kustomizations/base/svc.yaml` | Services: `wren-engine-svc` (ports 8080, 7432), `wren-ibis-server-svc` (port 8000) |

## Layer 6: legible-ui Adaptors

| File | Key Elements |
|------|-------------|
| `legible-ui/src/apollo/server/adaptors/ibisAdaptor.ts` | HTTP client for ibis-server — all v2/v3 connector endpoints (query, dry-plan, validate, metadata, model-substitute, version). Response types, connection info transformation. |
| `legible-ui/src/apollo/server/adaptors/wrenEngineAdaptor.ts` | HTTP client for legacy Java engine — v1 endpoints (MDL deploy, dry-run, preview, query, status, config). Response types. |
| `legible-ui/src/apollo/server/config.ts` | `IConfig` interface — `wrenEngineEndpoint` (default `http://localhost:8080`), `ibisServerEndpoint` (default `http://127.0.0.1:8000`), `experimentalEngineRustVersion` flag |
| `legible-ui/src/apollo/server/utils/error.ts` | Error codes: `IBIS_SERVER_ERROR`, `WREN_ENGINE_ERROR` |

## Layer 7: wren-ai-service Engine Providers

| File | Key Elements |
|------|-------------|
| `wren-ai-service/src/providers/engine/wren.py` | `@provider("wren_ibis")` class `IbisServer` — calls ibis-server v3 endpoints (query, dry-plan, functions, knowledge). `@provider("wren_engine")` class `WrenEngine` — calls legacy v1 endpoints. |
| `docker/config.yaml` | Engine provider block: `type: engine`, `provider: wren_ibis`, `endpoint: http://ibis-server:8000` |
| `docker/config.example.yaml` | Same engine provider block (example) |

### AI Service Config Examples (13 files)

All reference `provider: wren_ibis` and `endpoint: http://ibis-server:8000`:

| File |
|------|
| `wren-ai-service/docs/config_examples/config.anthropic.yaml` |
| `wren-ai-service/docs/config_examples/config.azure.yaml` |
| `wren-ai-service/docs/config_examples/config.bedrock.yaml` |
| `wren-ai-service/docs/config_examples/config.deepseek.yaml` |
| `wren-ai-service/docs/config_examples/config.google_ai_studio.yaml` |
| `wren-ai-service/docs/config_examples/config.google_vertexai.yaml` |
| `wren-ai-service/docs/config_examples/config.grok.yaml` |
| `wren-ai-service/docs/config_examples/config.groq.yaml` |
| `wren-ai-service/docs/config_examples/config.lm_studio.yaml` |
| `wren-ai-service/docs/config_examples/config.ollama.yaml` |
| `wren-ai-service/docs/config_examples/config.open_router.yaml` |
| `wren-ai-service/docs/config_examples/config.qwen3.yaml` |
| `wren-ai-service/docs/config_examples/config.zhipu.yaml` |

## Layer 8: Documentation

| File | Key References |
|------|---------------|
| `docs-site/docs/deployment/docker.md` | Service table: `ibis-server` → `wren-engine-ibis:local`, `wren-engine` → `wren-engine:local` |
| `docs-site/docs/deployment/kubernetes.md` | Deployment list including `wren-engine`, `wren-ibis-server`. Service port table. |
| `docs-site/docs/getting-started/installation.md` | Expected services list: `wren-engine`, `ibis-server` |
| `docs-site/docs/guides/mcp-integration.md` | MCP configuration referencing `ibis-server` service |

## Layer 9: Agent Configuration

| File | Key References |
|------|---------------|
| `.claude/CLAUDE.md` | Full wren-engine architecture docs, build commands, test markers, module descriptions |
| `.claude/settings.json` | Allowed commands for `cargo`, `just` in wren-core, wren-core-py, ibis-server directories |

## Layer 10: Contributing & Templates

| File | Key References |
|------|---------------|
| `CONTRIBUTING.md` | Directs engine contributors to wren-engine, links to `wren-engine/ibis-server/docs/CONTRIBUTING.md`, instructions for commenting out `wren-engine` in dev compose |
| `.github/ISSUE_TEMPLATE/bug_report.md` | Container names for log collection: `wrenai-wren-engine-1`, `wrenai-ibis-server-1` |

## Layer 11: Other References

| File | Key References |
|------|---------------|
| `.gitignore` | Ignore rules for `wren-ai-service/src/eval/wren-engine/` (eval harness) |
