---
name: upgrade-openshell-nemoclaw
description: "Upgrade OpenShell and NemoClaw integrations across the Legible stack. Use when: upgrading OpenShell CLI version, upgrading NemoClaw CLI version, updating blueprint YAML specs, updating network policy formats, adding new OpenShell/NemoClaw CLI commands, bumping sandbox image versions, updating inference provider APIs, or performing a periodic dependency refresh of either project. Covers CLI (Go), backend (TypeScript), frontend (React), Docker, and deployment."
argument-hint: "Describe what changed upstream (e.g. 'OpenShell v0.2.0 added new sandbox flags')"
---

# Upgrade OpenShell & NemoClaw

Systematic process for upgrading OpenShell and/or NemoClaw integrations across all layers of the Legible application. Both projects are external NVIDIA dependencies that evolve independently.

## When to Use

- A new OpenShell or NemoClaw CLI release is available
- Blueprint YAML spec version changes
- Network policy format changes
- New CLI commands or flags are added upstream
- Sandbox image base or entrypoint changes
- Inference provider API changes
- Periodic dependency refresh (recommended: monthly)

## Pre-Flight

Before starting, gather the upstream changes:

1. **Check upstream releases**
   ```bash
   # OpenShell — check latest release & changelog
   curl -s https://api.github.com/repos/NVIDIA/OpenShell/releases/latest | jq '.tag_name, .body'

   # NemoClaw — check install script for version
   curl -sI https://www.nvidia.com/nemoclaw.sh | grep -i version
   ```

2. **Read the upstream changelog** for breaking changes, new commands, deprecated flags, and spec version bumps.

3. **Identify scope** — determine which layers are affected:
   - CLI only (new flags/commands) → Go changes
   - Spec version bump → Blueprint YAMLs + Go types + seed data
   - Policy format change → Policy YAMLs + Go/TS policy types
   - New inference providers → Blueprint profiles + backend services
   - All of the above → Full-stack upgrade

## Upgrade Procedure

Work through each layer in order. Skip layers that aren't affected.

### Layer 1: Blueprint YAML Definitions

**Files:** `legible-cli/openshell/blueprints/*/blueprint.yaml` (14 blueprints)
**Files:** `legible-cli/openshell/blueprints/*/policies/*.yaml` (14 policy files)

See [file-inventory.md](./references/file-inventory.md) for the complete list.

1. Update `version` field in each blueprint if the spec version changed
2. Update `min_openshell_version` if the minimum required CLI version changed
3. Update `components.sandbox.image` if the base image changed
4. Update `components.tools.install` if new CLI tools are available
5. Update `components.inference.profiles` if provider endpoints/models changed
6. Update `policies/` YAML files if the network policy format changed
7. Update `components.mcp` if MCP transport or URL format changed

**Validation:**
```bash
# Parse all blueprints to verify YAML syntax
cd legible-cli
for f in openshell/blueprints/*/blueprint.yaml; do
  echo "Checking $f..."
  python3 -c "import yaml; yaml.safe_load(open('$f'))" || echo "FAIL: $f"
done
```

### Layer 2: Go CLI Types & Commands

**Primary files:**
- `legible-cli/internal/agent/blueprint.go` — Blueprint struct, component types
- `legible-cli/internal/agent/openshell.go` — OpenShell CLI wrapper functions
- `legible-cli/internal/agent/nemoclaw.go` — NemoClaw CLI wrapper functions
- `legible-cli/cmd/agent.go` — Agent CLI commands (create, list, connect, delete, policy, logs)
- `legible-cli/cmd/blueprint.go` — Blueprint CLI commands (list, show, recommend, for-connector)

**Update checklist:**
1. If the blueprint YAML spec added/renamed/removed fields:
   - Update `Blueprint` struct and sub-structs in `blueprint.go`
   - Update `yaml` tags to match new field names
   - Update `LoadBlueprint()` if parsing logic changed
2. If OpenShell CLI added new commands or changed flags:
   - Update wrapper functions in `openshell.go`
   - Update `cmd/agent.go` to expose new capabilities
   - Update `EnsureGateway()` if health check endpoint changed
3. If NemoClaw CLI changed:
   - Update `nemoclaw.go` wrapper functions
   - Update `NemoClawAvailable()` detection logic
4. If the connector-to-blueprint mapping changed:
   - Update `connectorBlueprintMap` in `blueprint.go`

**Validation:**
```bash
cd legible-cli
go build ./...
go vet ./...
go run . blueprint list
go run . blueprint recommend POSTGRES
```

### Layer 3: Database Migrations

Only needed if the schema changes (new fields on agent/blueprint/registry tables).

**Migration directory:** `legible-ui/migrations/`

1. Create a new migration file: `npx knex migrate:make <name>`
2. Add/alter columns as needed
3. Run migration: `cd legible-ui && npx knex migrate:latest`

**Key tables:**
- `agent` — sandbox agent instances
- `blueprint` — project-level blueprint copies
- `blueprint_registry` — template catalog
- `auto_provision_config` — per-project auto-provision settings
- `agent_audit_log` — agent action history

### Layer 4: Backend Repositories & Services

**Repositories** (update interfaces and transforms if DB schema changed):
- `legible-ui/src/apollo/server/repositories/agentRepository.ts`
- `legible-ui/src/apollo/server/repositories/blueprintRepository.ts`
- `legible-ui/src/apollo/server/repositories/blueprintRegistryRepository.ts`
- `legible-ui/src/apollo/server/repositories/autoProvisionConfigRepository.ts`

**Services** (update business logic):
- `legible-ui/src/apollo/server/services/agentService.ts`
- `legible-ui/src/apollo/server/services/blueprintService.ts`
- `legible-ui/src/apollo/server/services/blueprintRegistryService.ts` — includes `CONNECTOR_BLUEPRINT_MAP`
- `legible-ui/src/apollo/server/services/autoProvisionService.ts` — includes `CONNECTOR_BLUEPRINT_MAP`

**Seed data:**
- `legible-ui/src/apollo/server/utils/seedRegistry.ts` — update `BUILTIN_ENTRIES` if blueprints changed

**Resolvers:**
- `legible-ui/src/apollo/server/resolvers/agentResolver.ts`
- `legible-ui/src/apollo/server/resolvers/blueprintResolver.ts`
- `legible-ui/src/apollo/server/resolvers/blueprintRegistryResolver.ts`

**Important:** The `CONNECTOR_BLUEPRINT_MAP` is duplicated in two services (`blueprintRegistryService.ts` and `autoProvisionService.ts`). Keep them in sync.

### Layer 5: GraphQL Schema

**File:** `legible-ui/src/apollo/server/schema.ts`

Update if types, inputs, queries, or mutations change. Key types:
- `AgentType`, `AgentStatus` enum
- `BlueprintType`, `BlueprintRegistryEntryType`
- `AutoProvisionConfigType`, `AutoProvisionResultType`
- Input types: `CreateAgentInput`, `CreateBlueprintInput`, `SetAutoProvisionConfigInput`

**Resolver wiring:**
- `legible-ui/src/apollo/server/resolvers.ts` — query/mutation mappings
- `legible-ui/src/apollo/server/types/context.ts` — service interfaces
- `legible-ui/src/common.ts` — service instantiation
- `legible-ui/src/pages/api/graphql.ts` — context injection

### Layer 6: Frontend GraphQL & UI

**GraphQL operations:**
- `legible-ui/src/apollo/client/graphql/agents.ts` — agent queries/mutations
- `legible-ui/src/apollo/client/graphql/blueprints.ts` — blueprint queries/mutations
- `legible-ui/src/apollo/client/graphql/registry.ts` — registry & auto-provision operations

**Generated hooks** (update types to match schema changes):
- `legible-ui/src/apollo/client/graphql/agents.generated.ts`
- `legible-ui/src/apollo/client/graphql/blueprints.generated.ts`
- `legible-ui/src/apollo/client/graphql/registry.generated.ts`

**Pages:**
- `legible-ui/src/pages/projects/[projectId]/agents/index.tsx` — agent management + auto-provision button
- `legible-ui/src/pages/projects/[projectId]/blueprints/index.tsx` — blueprint management
- `legible-ui/src/pages/projects/[projectId]/blueprints/registry.tsx` — template gallery

**Sidebar:**
- `legible-ui/src/components/sidebar/Blueprints.tsx`
- `legible-ui/src/utils/enum/path.ts` — route paths
- `legible-ui/src/utils/enum/menu.ts` — menu keys

### Layer 7: Docker & Deployment

**Sandbox Docker:**
- `legible-cli/openshell/Dockerfile` — base image, installed packages
- `legible-cli/openshell/sandbox-entrypoint.sh` — startup script
- `legible-cli/openshell/sandbox-mcp-config.json` — MCP connection config
- `legible-cli/openshell/policy.yaml` — default network policy

**Compose:**
- `docker/docker-compose.yaml` — environment variables for MCP/UI endpoints

## Post-Upgrade Verification

Run the full verification checklist from [checklist.md](./references/checklist.md).

Quick smoke test:
```bash
# 1. Go CLI
cd legible-cli && go build ./... && go vet ./...
go run . blueprint list
go run . blueprint recommend POSTGRES

# 2. Frontend build
cd legible-ui && npx next build

# 3. Docker build (if Dockerfile changed)
cd legible-cli/openshell && docker build -t legible-sandbox:latest .
```

## Version Tracking

After upgrading, update these version references:
- `min_openshell_version` in all 14 `blueprint.yaml` files
- Install URLs in `openshell.go` and `nemoclaw.go` if they changed
- `BUILTIN_ENTRIES` in `seedRegistry.ts` if blueprint content changed
- This skill's metadata version (frontmatter above)

## Common Pitfalls

1. **CONNECTOR_BLUEPRINT_MAP duplication** — exists in both `blueprintRegistryService.ts` and `autoProvisionService.ts`. Always update both.
2. **Seed data drift** — `seedRegistry.ts` entries must match the blueprint YAML files in `openshell/blueprints/`. If you update one, update the other.
3. **Policy format mismatch** — NemoClaw policy YAML format may change between versions. Test policy application with `openshell policy set` after upgrading.
4. **Generated types** — the `.generated.ts` files are hand-maintained (not codegen). Update interfaces manually when schema fields change.
5. **Blueprint version vs min_openshell_version** — these are independent. A blueprint's `version` is its own version; `min_openshell_version` is the minimum OpenShell CLI it requires.
