# Upgrade Verification Checklist

Use this checklist after completing a wren-engine upgrade. Each item should pass before merging.

## Submodule Verification

- [ ] `cd wren-engine && git log --oneline -1` — shows the target commit/tag
- [ ] `git submodule status wren-engine` — commit hash matches, no `+` prefix (no uncommitted changes)
- [ ] Target tag exists on upstream: `cd wren-engine && git tag -l | grep <version>`

## Docker Build Verification

- [ ] `./start.sh --build-only` — all images build successfully
- [ ] `wren-engine:local` image builds from `wren-engine/wren-core-legacy/docker/Dockerfile`
- [ ] `wren-engine-ibis:local` image builds from `wren-engine/ibis-server/Dockerfile`
- [ ] No new build warnings about missing files or contexts

## Docker Compose — Production

- [ ] `cd docker && docker compose config` — validates without errors
- [ ] `docker compose up -d` — all services start
- [ ] `docker compose ps` — `wren-engine` and `ibis-server` are healthy/running
- [ ] No new unset environment variable warnings in compose output

## Docker Compose — Dev

- [ ] `cd docker && docker compose -f docker-compose-dev.yaml config` — validates
- [ ] Image tags in `docker-compose-dev.yaml` match the target GHCR version
- [ ] `wren-ai-service/tools/dev/docker-compose-dev.yaml` image tags match

## Service Health Checks

### Legacy Engine (wren-engine)
- [ ] `curl -s http://localhost:8080/v1/mdl/status` — returns valid JSON with `systemStatus`
- [ ] Container logs show no startup errors: `docker compose logs wren-engine | tail -20`

### Ibis Server
- [ ] `curl -s http://localhost:8000/` — returns a response (health/root endpoint)
- [ ] Container logs show no startup errors: `docker compose logs ibis-server | tail -20`

### MCP Server (if enabled)
- [ ] `curl -s http://localhost:9000/` — MCP endpoint responds
- [ ] `curl -s http://localhost:9001/` — MCP Web UI responds (if `MCP_WEB_UI_PORT` mapped)

## API Compatibility

### ibis-server v3 Endpoints
- [ ] POST `/v3/connector/{source}/query` — returns query results (test with a simple SELECT)
- [ ] POST `/v3/connector/{source}/metadata/tables` — returns table list
- [ ] POST `/v3/connector/{source}/dry-plan` — returns native SQL
- [ ] GET `/v3/connector/{source}/functions` — returns function catalog

### ibis-server v2 Endpoints (if still used)
- [ ] POST `/v2/connector/{source}/query` — works as fallback
- [ ] POST `/v2/connector/{source}/metadata/tables` — works as fallback

### Legacy Engine v1 Endpoints
- [ ] GET `/v1/mdl/status` — returns deploy status
- [ ] GET `/v1/mdl/dry-run` — accepts manifest + SQL body

## Kubernetes Manifests

- [ ] `kustomization.yaml` — `newTag` updated for both `wren-engine` and `wren-engine-ibis` images
- [ ] `cm.yaml` — `WREN_ENGINE_VERSION` matches target version (if tracked)
- [ ] `kubectl kustomize deployment/kustomizations/` — renders without errors (if kubectl available)
- [ ] No new required env vars missing from deployment specs

## legible-ui Adaptor Compatibility

- [ ] `ibisAdaptor.ts` — all endpoint paths match upstream v3 router
- [ ] `wrenEngineAdaptor.ts` — all endpoint paths match upstream v1 API
- [ ] `config.ts` — default endpoints still correct (`http://localhost:8080`, `http://127.0.0.1:8000`)
- [ ] `cd legible-ui && npx next build` — no TypeScript errors

## wren-ai-service Provider Compatibility

- [ ] `wren.py` `IbisServer` class endpoints match upstream v3 router
- [ ] `wren.py` `WrenEngine` class endpoints match upstream v1 API
- [ ] `docker/config.yaml` engine provider endpoint is correct
- [ ] `docker/config.example.yaml` engine provider endpoint is correct
- [ ] All 13 config examples reference correct endpoint

## Documentation

- [ ] `docs-site/docs/deployment/docker.md` — image names and service table correct
- [ ] `docs-site/docs/deployment/kubernetes.md` — deployment and port references correct
- [ ] `docs-site/docs/getting-started/installation.md` — expected services list correct
- [ ] `docs-site/docs/guides/mcp-integration.md` — MCP config references correct

## Agent Configuration

- [ ] `.claude/CLAUDE.md` — build commands, architecture, and test markers are current
- [ ] `.claude/settings.json` — allowed commands still valid

## Integration Smoke Test

- [ ] legible-ui can connect to a data source via ibis-server (end-to-end query)
- [ ] wren-ai-service can call ibis-server for SQL execution
- [ ] MCP clients can connect to the MCP endpoint (if MCP enabled)
- [ ] No regressions in query results compared to previous version

## Version Consistency

After upgrading, verify these version references are all aligned:

| Location | Variable/Field | Expected Value |
|----------|---------------|---------------|
| `wren-engine/` submodule | git commit | Target tag/commit |
| `docker/docker-compose-dev.yaml` | `WREN_ENGINE_VERSION` env | New legacy engine version |
| `docker/docker-compose-dev.yaml` | `IBIS_SERVER_VERSION` env | New ibis-server version |
| `deployment/kustomizations/kustomization.yaml` | `newTag` for wren-engine | New legacy engine version |
| `deployment/kustomizations/kustomization.yaml` | `newTag` for wren-engine-ibis | New ibis-server version |
| `deployment/kustomizations/base/cm.yaml` | `WREN_ENGINE_VERSION` | New version string |
| `wren-ai-service/tools/dev/docker-compose-dev.yaml` | `WREN_ENGINE_VERSION` env | New legacy engine version |
| `wren-ai-service/tools/dev/docker-compose-dev.yaml` | `IBIS_SERVER_VERSION` env | New ibis-server version |
