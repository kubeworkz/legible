# OpenShell & NemoClaw File Inventory

Complete list of files that may need changes during an upgrade, grouped by layer.

## Blueprint YAML Definitions

Blueprints live in `legible-cli/openshell/blueprints/`. Each has a `blueprint.yaml` and a `policies/` subdirectory.

| Blueprint | Connectors | Policy File |
|-----------|-----------|-------------|
| `legible-default/blueprint.yaml` | All 12 | `policies/legible-default.yaml` |
| `legible-analyst/blueprint.yaml` | All 12 | `policies/legible-analyst.yaml` |
| `legible-postgres/blueprint.yaml` | POSTGRES | `policies/legible-postgres.yaml` |
| `legible-bigquery/blueprint.yaml` | BIG_QUERY | `policies/legible-bigquery.yaml` |
| `legible-snowflake/blueprint.yaml` | SNOWFLAKE | `policies/legible-snowflake.yaml` |
| `legible-mysql/blueprint.yaml` | MYSQL | `policies/legible-mysql.yaml` |
| `legible-clickhouse/blueprint.yaml` | CLICK_HOUSE | `policies/legible-clickhouse.yaml` |
| `legible-duckdb/blueprint.yaml` | DUCKDB | `policies/legible-duckdb.yaml` |
| `legible-mssql/blueprint.yaml` | MSSQL | `policies/legible-mssql.yaml` |
| `legible-oracle/blueprint.yaml` | ORACLE | `policies/legible-oracle.yaml` |
| `legible-trino/blueprint.yaml` | TRINO | `policies/legible-trino.yaml` |
| `legible-redshift/blueprint.yaml` | REDSHIFT | `policies/legible-redshift.yaml` |
| `legible-databricks/blueprint.yaml` | DATABRICKS | `policies/legible-databricks.yaml` |
| `legible-athena/blueprint.yaml` | ATHENA | `policies/legible-athena.yaml` |

## Go CLI Code

| File | Key Elements |
|------|-------------|
| `legible-cli/internal/agent/blueprint.go` | `Blueprint` struct, `BlueprintComponents`, `BlueprintPolicies`, `BlueprintAgent`, `SandboxComponent`, `InferenceComponent`, `InferenceProfile`, `MCPComponent`, `MCPServer`, `ToolsComponent`, `ToolScript`, `FilesystemSpec`, `ProcessSpec`, `connectorBlueprintMap`, `LoadBlueprint()`, `ListBundledBlueprints()`, `RecommendedBlueprintForConnector()`, `BlueprintsForConnector()` |
| `legible-cli/internal/agent/openshell.go` | `openshellBinary()`, `RunOpenshell()`, `RunOpenshellOutput()`, `PolicyDir()`, `EnsureGateway()`, install URL constant |
| `legible-cli/internal/agent/nemoclaw.go` | `nemoclawBinary()`, `NemoClawAvailable()`, `RunNemoClaw()`, `RunNemoClawOutput()`, install URL constant |
| `legible-cli/cmd/agent.go` | `agent create`, `agent list`, `agent connect`, `agent delete`, `agent policy`, `agent logs` subcommands |
| `legible-cli/cmd/blueprint.go` | `blueprint list`, `blueprint show`, `blueprint recommend`, `blueprint for-connector` subcommands |

## Backend TypeScript

### Migrations
| File | Tables Affected |
|------|----------------|
| `wren-ui/migrations/20260331000001_create_agent_tables.js` | `agent`, `agent_audit_log` |
| `wren-ui/migrations/20260401000001_create_blueprint_table.js` | `blueprint` |
| `wren-ui/migrations/20260401000002_blueprint_registry.js` | `blueprint` (alter), `agent` (alter), `blueprint_registry`, `auto_provision_config` |

### Repositories
| File | Interface |
|------|-----------|
| `wren-ui/src/apollo/server/repositories/agentRepository.ts` | `Agent`, `IAgentRepository` |
| `wren-ui/src/apollo/server/repositories/blueprintRepository.ts` | `Blueprint`, `IBlueprintRepository` |
| `wren-ui/src/apollo/server/repositories/blueprintRegistryRepository.ts` | `BlueprintRegistryEntry`, `IBlueprintRegistryRepository` |
| `wren-ui/src/apollo/server/repositories/autoProvisionConfigRepository.ts` | `AutoProvisionConfig`, `IAutoProvisionConfigRepository` |

### Services
| File | Interface | Notable |
|------|-----------|---------|
| `wren-ui/src/apollo/server/services/agentService.ts` | `IAgentService` | |
| `wren-ui/src/apollo/server/services/blueprintService.ts` | `IBlueprintService` | |
| `wren-ui/src/apollo/server/services/blueprintRegistryService.ts` | `IBlueprintRegistryService` | Contains `CONNECTOR_BLUEPRINT_MAP` |
| `wren-ui/src/apollo/server/services/autoProvisionService.ts` | `IAutoProvisionService` | Contains `CONNECTOR_BLUEPRINT_MAP` (duplicate) |

### Resolvers
| File | Classes |
|------|---------|
| `wren-ui/src/apollo/server/resolvers/agentResolver.ts` | `AgentResolver` |
| `wren-ui/src/apollo/server/resolvers/blueprintResolver.ts` | `BlueprintResolver` |
| `wren-ui/src/apollo/server/resolvers/blueprintRegistryResolver.ts` | `BlueprintRegistryResolver`, `AutoProvisionResolver` |

### Schema & Wiring
| File | Purpose |
|------|---------|
| `wren-ui/src/apollo/server/schema.ts` | GraphQL type definitions |
| `wren-ui/src/apollo/server/resolvers.ts` | Query/mutation → resolver mappings |
| `wren-ui/src/apollo/server/types/context.ts` | Service interfaces in context |
| `wren-ui/src/common.ts` | Service instantiation & dependency injection |
| `wren-ui/src/pages/api/graphql.ts` | Context injection, seed call |
| `wren-ui/src/apollo/server/repositories/index.ts` | Repository exports |
| `wren-ui/src/apollo/server/services/index.ts` | Service exports |

### Seed Data
| File | Purpose |
|------|---------|
| `wren-ui/src/apollo/server/utils/seedRegistry.ts` | `BUILTIN_ENTRIES` array — 14 entries matching blueprint YAMLs |

## Frontend TypeScript

### GraphQL Operations
| File | Operations |
|------|-----------|
| `wren-ui/src/apollo/client/graphql/agents.ts` | `AGENT_FIELDS` fragment, `LIST_AGENTS`, `GET_AGENT`, `CREATE_AGENT`, `UPDATE_AGENT`, `DELETE_AGENT`, `GET_AGENT_LOGS` |
| `wren-ui/src/apollo/client/graphql/blueprints.ts` | `BLUEPRINT_FIELDS` fragment, `LIST_BLUEPRINTS`, `GET_BLUEPRINT`, `CREATE_BLUEPRINT`, `UPDATE_BLUEPRINT`, `DELETE_BLUEPRINT` |
| `wren-ui/src/apollo/client/graphql/registry.ts` | `REGISTRY_ENTRY_FIELDS` fragment, `LIST_REGISTRY`, `SEARCH_REGISTRY_BY_CONNECTOR`, `RECOMMEND_BLUEPRINT`, `INSTALL_REGISTRY_ENTRY`, `PROVISION_AGENT`, `GET_AUTO_PROVISION_CONFIG`, `SET_AUTO_PROVISION_CONFIG` |

### Generated Hooks
| File | Key Types/Hooks |
|------|----------------|
| `wren-ui/src/apollo/client/graphql/agents.generated.ts` | `AgentFieldsFragment`, `useAgentsQuery`, `useCreateAgentMutation`, `useDeleteAgentMutation`, `useUpdateAgentMutation` |
| `wren-ui/src/apollo/client/graphql/blueprints.generated.ts` | `BlueprintData`, `CreateBlueprintInput`, `UpdateBlueprintInput`, `useBlueprintsQuery`, `useCreateBlueprintMutation`, `useDeleteBlueprintMutation` |
| `wren-ui/src/apollo/client/graphql/registry.generated.ts` | `RegistryEntryData`, `AutoProvisionConfigData`, `AutoProvisionResult`, `useRegistryQuery`, `useRegistryByConnectorQuery`, `useInstallRegistryEntryMutation`, `useProvisionAgentMutation` |

### Pages
| File | Features |
|------|---------|
| `wren-ui/src/pages/projects/[projectId]/agents/index.tsx` | Agent table, create modal, auto-provision button |
| `wren-ui/src/pages/projects/[projectId]/blueprints/index.tsx` | Blueprint table, create modal, YAML viewer |
| `wren-ui/src/pages/projects/[projectId]/blueprints/registry.tsx` | Template gallery with connector/category filters |

### Navigation
| File | Elements |
|------|---------|
| `wren-ui/src/components/sidebar/Blueprints.tsx` | Sidebar with "All Blueprints" and "Template Gallery" items |
| `wren-ui/src/utils/enum/path.ts` | `Path.Blueprints`, `Path.BlueprintRegistry` |
| `wren-ui/src/utils/enum/menu.ts` | `MENU_KEY.BLUEPRINTS`, `MENU_KEY.BLUEPRINT_REGISTRY` |

## Docker & Deployment

| File | Purpose |
|------|---------|
| `legible-cli/openshell/Dockerfile` | Sandbox container image (base: python:3.11-slim) |
| `legible-cli/openshell/sandbox-entrypoint.sh` | Container startup script |
| `legible-cli/openshell/sandbox-mcp-config.json` | MCP server connection config |
| `legible-cli/openshell/policy.yaml` | Default network policy (env-var templated) |
| `docker/docker-compose.yaml` | Service definitions, env vars for MCP/UI endpoints |

## External Dependencies

| Dependency | Location | Current |
|-----------|----------|---------|
| OpenShell install script | `openshell.go` | `https://raw.githubusercontent.com/NVIDIA/OpenShell/main/install.sh` |
| NemoClaw install script | `nemoclaw.go` | `https://www.nvidia.com/nemoclaw.sh` |
| Blueprint spec version | All `blueprint.yaml` | `0.1.0` |
| Min OpenShell version | All `blueprint.yaml` | `0.1.0` |
| Sandbox base image | `Dockerfile` | `python:3.11-slim` |
