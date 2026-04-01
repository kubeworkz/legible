# Upgrade Verification Checklist

Use this checklist after completing an OpenShell or NemoClaw upgrade. Each item should pass before merging.

## Build Verification

- [ ] `cd legible-cli && go build ./...` — no errors
- [ ] `cd legible-cli && go vet ./...` — no warnings
- [ ] `cd wren-ui && npx next build` — no TypeScript errors
- [ ] `cd wren-ui && npx knex migrate:latest` — migrations run cleanly (if changed)

## CLI Smoke Tests

- [ ] `go run . blueprint list` — all 14 blueprints listed with correct versions
- [ ] `go run . blueprint show legible-default` — shows updated version/min_openshell_version
- [ ] `go run . blueprint recommend POSTGRES` — returns legible-postgres
- [ ] `go run . blueprint for-connector SNOWFLAKE` — lists compatible blueprints
- [ ] `go run . agent create test-agent --blueprint legible-default` — creates agent (requires OpenShell running)
- [ ] `go run . agent list` — shows created agent
- [ ] `go run . agent delete test-agent` — cleans up

## Blueprint YAML Validation

- [ ] All 14 `blueprint.yaml` files parse without errors
- [ ] All `version` fields are consistent
- [ ] All `min_openshell_version` fields match the target OpenShell version
- [ ] All `policies/*.yaml` files parse without errors
- [ ] Connector-specific blueprints list correct `supported_connectors`

## Backend Verification

- [ ] `CONNECTOR_BLUEPRINT_MAP` is identical in `blueprintRegistryService.ts` and `autoProvisionService.ts`
- [ ] `BUILTIN_ENTRIES` in `seedRegistry.ts` match the 14 blueprint YAML files
- [ ] GraphQL schema types match repository interfaces
- [ ] Resolver wiring is complete (all queries/mutations in `resolvers.ts`)

## Frontend Verification

- [ ] `.generated.ts` type interfaces match GraphQL schema
- [ ] Blueprint fragment in `blueprints.ts` includes all fields
- [ ] Registry operations in `registry.ts` match schema queries/mutations
- [ ] Agents page renders without console errors
- [ ] Blueprints page renders without console errors
- [ ] Template Gallery page renders without console errors

## Docker Verification (if applicable)

- [ ] `docker build -t legible-sandbox:latest legible-cli/openshell/` — builds successfully
- [ ] Sandbox entrypoint starts without errors
- [ ] MCP connectivity works from inside sandbox
- [ ] Network policy applies correctly via `openshell policy set`

## Integration Tests (if OpenShell/NemoClaw available)

- [ ] `openshell --version` shows expected version
- [ ] `openshell provider create` with Legible credentials succeeds
- [ ] `openshell sandbox create` from blueprint succeeds
- [ ] `openshell policy set <sandbox> <policy.yaml>` succeeds
- [ ] NemoClaw inference routing works (if NemoClaw updated)

## Data Consistency

- [ ] Existing agents in DB are unaffected by migration
- [ ] Existing blueprints in DB are unaffected by migration
- [ ] Registry seed runs idempotently (no duplicates on restart)
- [ ] Auto-provision config entries are preserved
