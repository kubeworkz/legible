---
name: upgrade-wren-engine
description: "Upgrade the wren-engine git submodule and all downstream integration points across the Legible stack. Use when: bumping wren-engine, ibis-server, wren-core-py, or mcp-server versions, updating Docker images, adapting to upstream API changes, updating Kubernetes manifests, or performing a periodic dependency refresh of the Canner/wren-engine project. Covers submodule, Docker, Kubernetes, legible-ui adaptors, wren-ai-service providers, and documentation."
argument-hint: "Describe the target version or upstream change (e.g. 'Upgrade ibis-server to v0.26.0' or 'Sync wren-engine submodule to latest main')"
---

# Upgrade Wren Engine

Systematic process for upgrading the [Canner/wren-engine](https://github.com/Canner/wren-engine) submodule and all its integration points across the Legible application.

## When to Use

- A new ibis-server, wren-core-py, mcp-server, or wren-core-legacy release is available
- Upstream API endpoints changed (added, removed, or modified)
- New environment variables or configuration options were introduced
- Docker image tags need bumping
- Periodic dependency refresh (recommended: per upstream release)

## Background

### Upstream Component Map

wren-engine is a monorepo with **four independently-versioned components** managed by release-please:

| Component | Docker Image | Purpose |
|-----------|-------------|---------|
| `ibis-server` | `ghcr.io/canner/wren-engine-ibis` | FastAPI server — query execution, validation, metadata, 22+ connectors |
| `wren-core-legacy` | `ghcr.io/canner/wren-engine` | Legacy Java engine — fallback for v2 queries |
| `wren-core-py` | (built into ibis-server image) | PyO3 bindings — Rust engine exposed to Python |
| `mcp-server` | (bundled in ibis-server via `ENABLE_MCP_SERVER`) | MCP server for AI agents |

### Release Tag Format

Since April 2026, upstream uses independent tags per component:
- `ibis-server-v0.25.0`
- `mcp-server-v0.25.0`
- `wren-core-py-v0.4.0`

Older releases used a single monolithic tag (e.g. `0.24.6`).

Docker images on GHCR use the version number without prefix (e.g. `0.25.0`, not `ibis-server-v0.25.0`).

### How Legible Consumes wren-engine

1. **Git submodule** at `wren-engine/` — source code for local Docker builds
2. **Two Docker images** built from source (`start.sh`) or pulled from GHCR (dev compose)
3. **HTTP APIs** consumed by `legible-ui` adaptors and `wren-ai-service` engine providers
4. **Kubernetes deployments** with image tags in kustomization overlays

## Pre-Flight

Before starting, gather upstream changes:

1. **Check upstream releases**
   ```bash
   # Latest releases for each component
   curl -s "https://api.github.com/repos/Canner/wren-engine/releases?per_page=10" | \
     jq '.[] | {tag_name, published_at, body}' | head -80

   # Or browse: https://github.com/Canner/wren-engine/releases
   ```

2. **Read the upstream changelog** for:
   - Breaking API changes (new/removed/modified endpoints)
   - New environment variables
   - Dockerfile changes (base image, build args, exposed ports)
   - Dependency updates (DataFusion fork, Ibis fork versions)
   - wren-core-py API changes (affects ibis-server internals)

3. **Identify scope** — determine which layers are affected:

   | Change Type | Layers Affected |
   |-------------|----------------|
   | Version bump only (no API changes) | Submodule, Docker images, Kubernetes tags |
   | New/changed endpoints | + legible-ui adaptors, wren-ai-service providers |
   | New environment variables | + Docker compose files, Kubernetes ConfigMap |
   | Dockerfile restructure | + start.sh build script |
   | Port changes | + Kubernetes services, Docker compose port mappings |
   | New connector | + legible-ui DataSourceName enum (if exposed to users) |

## Upgrade Procedure

Work through each layer in order. Skip layers that aren't affected.

### Layer 1: Git Submodule

**File:** `wren-engine/` (submodule), `.gitmodules`

```bash
cd wren-engine
git fetch origin
git checkout <target-tag-or-commit>
cd ..
git add wren-engine
```

**Verification:**
```bash
cd wren-engine && git log --oneline -1
# Should show the target commit
```

### Layer 2: Docker Compose — Production

**File:** `docker/docker-compose.yaml`

The production compose uses locally-built images (`wren-engine:local`, `wren-engine-ibis:local`), so no image tag changes needed. However, check for:

1. New environment variables on the `ibis-server` or `wren-engine` service
2. New/changed exposed ports
3. New volume mounts
4. Changes to the MCP server flags (`ENABLE_MCP_SERVER`, `MCP_TRANSPORT`, `MCP_HOST`, `MCP_PORT`)

Key environment variables on `ibis-server` service:
```yaml
environment:
  WREN_ENGINE_ENDPOINT: http://wren-engine:${WREN_ENGINE_PORT}
  ENABLE_MCP_SERVER: "true"
  MCP_TRANSPORT: streamable-http
  MCP_HOST: 0.0.0.0
  MCP_PORT: "9000"
  WREN_URL: localhost:8000
  WREN_UI_ENDPOINT: http://legible-ui:3000
  INTERNAL_SERVICE_TOKEN: ${INTERNAL_SERVICE_TOKEN}
```

### Layer 3: Docker Compose — Dev

**File:** `docker/docker-compose-dev.yaml`

Update GHCR image tags. These come from `.env` variables:
- `WREN_ENGINE_VERSION` → `ghcr.io/canner/wren-engine:${WREN_ENGINE_VERSION}`
- `IBIS_SERVER_VERSION` → `ghcr.io/canner/wren-engine-ibis:${IBIS_SERVER_VERSION}`

Also check `wren-ai-service/tools/dev/docker-compose-dev.yaml` which uses the same image references.

### Layer 4: Build Script

**File:** `start.sh`

Only needs changes if:
- The Dockerfile path moved (currently `wren-engine/wren-core-legacy/docker/Dockerfile` for legacy engine, `wren-engine/ibis-server/Dockerfile` for ibis)
- Build context requirements changed (e.g. ibis-server Dockerfile now needs `wren-core/` or `wren-core-base/` as build context)
- New build arguments required

Current build commands:
```bash
# Legacy engine
docker build -q -t wren-engine:local \
  -f "$ROOT_DIR/wren-engine/wren-core-legacy/docker/Dockerfile" \
  "$ROOT_DIR/wren-engine/wren-core-legacy"

# Ibis server
docker build -q -t wren-engine-ibis:local \
  "$ROOT_DIR/wren-engine/ibis-server"
```

**Important:** The ibis-server Dockerfile may reference other workspace directories (`wren-core/`, `wren-core-base/`, `wren-core-py/`) via build contexts. If the upstream Dockerfile added new `COPY` directives, `start.sh` may need additional build context flags.

### Layer 5: Kubernetes Manifests

**Files:**
- `deployment/kustomizations/kustomization.yaml` — image tag overrides
- `deployment/kustomizations/base/deploy-wren-engine.yaml` — legacy engine deployment
- `deployment/kustomizations/base/deploy-wren-ibis-server.yaml` — ibis-server deployment
- `deployment/kustomizations/base/cm.yaml` — ConfigMap with endpoints and version strings
- `deployment/kustomizations/base/svc.yaml` — Services (ports)

**Update checklist:**
1. Bump `newTag` for `ghcr.io/canner/wren-engine` and `ghcr.io/canner/wren-engine-ibis` in `kustomization.yaml`
2. Update `WREN_ENGINE_VERSION` in `cm.yaml` if tracked for telemetry
3. Add new env vars to deployment specs if upstream requires them
4. Update container ports in deployment and service specs if changed

### Layer 6: legible-ui Adaptors

**Files:**
- `legible-ui/src/apollo/server/adaptors/ibisAdaptor.ts` — HTTP client for ibis-server
- `legible-ui/src/apollo/server/adaptors/wrenEngineAdaptor.ts` — HTTP client for legacy engine
- `legible-ui/src/apollo/server/config.ts` — endpoint configuration
- `legible-ui/src/apollo/server/utils/error.ts` — error codes

**When to update:** If upstream added, removed, or changed API endpoints. See [api-surface.md](./references/api-surface.md) for the full current endpoint inventory.

**How to check for changes:**
```bash
# Compare ibis-server router changes between old and new commits
cd wren-engine
git diff <old-tag>..<new-tag> -- ibis-server/app/routers/
```

Key patterns:
- `ibisAdaptor.ts` uses v3 endpoints by default, falls back to v2 when `experimentalEngineRustVersion` is off
- URL construction uses: `${config.ibisServerEndpoint}/v3/connector/${snakeCase(source)}/...`
- Response types are defined inline in the adaptor file
- Connection info is transformed via `toIbisConnectionInfo()` before sending

### Layer 7: wren-ai-service Engine Providers

**Files:**
- `wren-ai-service/src/providers/engine/wren.py` — `WrenIbis` and `WrenEngine` provider classes
- `docker/config.yaml` — production engine config
- `docker/config.example.yaml` — example config
- `wren-ai-service/tools/dev/docker-compose-dev.yaml` — dev compose with image refs
- `wren-ai-service/docs/config_examples/*.yaml` — 13 config example files

**When to update:** If ibis-server added new endpoints the AI service should use (e.g. new function/knowledge APIs), or if endpoint signatures changed.

**Config reference:**
```yaml
type: engine
provider: wren_ibis
endpoint: http://ibis-server:8000
```

### Layer 8: Documentation

**Files:**
- `docs-site/docs/deployment/docker.md` — service table, image names
- `docs-site/docs/deployment/kubernetes.md` — deployment list, service ports
- `docs-site/docs/getting-started/installation.md` — expected services list
- `docs-site/docs/guides/mcp-integration.md` — MCP config referencing ibis-server

**When to update:** Service name, port, or configuration changes.

### Layer 9: Agent Configuration

**Files:**
- `.claude/CLAUDE.md` — build commands, architecture docs, test markers
- `.claude/settings.json` — allowed commands for wren-engine modules

**When to update:** Build commands changed, new modules added, or test markers changed.

### Layer 10: Contributing & Templates

**Files:**
- `CONTRIBUTING.md` — references wren-engine for contributor setup
- `.github/ISSUE_TEMPLATE/bug_report.md` — container names for log collection

**When to update:** Container names changed.

## Post-Upgrade Verification

Run the full verification checklist from [checklist.md](./references/checklist.md).

Quick smoke test:
```bash
# 1. Build images from updated submodule
./start.sh --build-only

# 2. Start services
cd docker && docker compose up -d

# 3. Health check — legacy engine
curl -s http://localhost:8080/v1/mdl/status | jq .

# 4. Health check — ibis-server
curl -s http://localhost:8000/

# 5. MCP server (if enabled)
curl -s http://localhost:9000/
```

## Common Pitfalls

1. **Independent versioning** — ibis-server, mcp-server, and wren-core-py have separate version tags since April 2026. The monolithic tag format (e.g. `0.24.6`) was used before. Docker GHCR images use just the version number. Check which format applies to your target version.

2. **wren-core-py built into ibis image** — There is no separate wren-core-py container. The Rust engine is compiled via PyO3/Maturin during the ibis-server Docker build. Cross-platform builds may require `zig` and appropriate Rust targets.

3. **MCP server bundled in ibis-server** — Activated by `ENABLE_MCP_SERVER=true`. Ports 9000 (MCP) and 9001 (Web UI) are forwarded from the ibis-server container. If upstream changed MCP configuration, update the environment variables.

4. **v2 vs v3 API** — legible-ui uses v3 by default but falls back to v2 when `experimentalEngineRustVersion` is disabled. If upstream removes v2 endpoints, the fallback path will break.

5. **GHCR image name confusion** — `ghcr.io/canner/wren-engine` is the legacy Java engine. `ghcr.io/canner/wren-engine-ibis` is the ibis+Rust server. Don't mix them up.

6. **AI service config examples** — All 13 config files in `wren-ai-service/docs/config_examples/` reference ibis-server endpoint. Keep them consistent with the actual service name and port.

7. **ibis-server Docker build context** — The ibis-server Dockerfile may `COPY` from sibling directories (`wren-core/`, `wren-core-base/`, `wren-core-py/`). If upstream restructured the build, `start.sh` may need updated build context paths or `--build-context` flags.

8. **Kubernetes tag drift** — `kustomization.yaml` has `newTag` overrides, but `deploy-wren-engine.yaml` and `deploy-wren-ibis-server.yaml` have hardcoded image tags in the base specs. The kustomize overlay takes precedence, but keep them reasonably in sync to avoid confusion.

9. **ConfigMap version strings** — `cm.yaml` contains `WREN_ENGINE_VERSION` used for telemetry in legible-ui. Update it to match the actual deployed version.
