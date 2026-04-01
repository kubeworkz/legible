---
sidebar_position: 3
title: Blueprints
---

# Blueprints

Blueprints are pre-configured agent templates that bundle a sandbox image, inference profiles, network policies, and resource limits into a single deployable spec. They follow the NemoClaw-compatible blueprint format.

## Using a Blueprint

Create an agent from a blueprint:

```bash
legible agent create my-analyst --blueprint legible-default
```

With a specific inference profile:

```bash
legible agent create my-analyst --blueprint legible-default --profile anthropic
```

## Built-in Blueprints

Legible ships blueprints optimized for different data sources:

| Blueprint | Data Sources | Description |
|-----------|-------------|-------------|
| `legible-default` | All connectors | General-purpose agent with broad connector support |
| `legible-postgres` | PostgreSQL | Optimized for PostgreSQL workloads |
| `legible-bigquery` | BigQuery | Optimized for BigQuery analytics |
| `legible-snowflake` | Snowflake | Optimized for Snowflake data warehouse |
| `legible-mysql` | MySQL | Optimized for MySQL databases |
| `legible-clickhouse` | ClickHouse | Optimized for ClickHouse analytics |
| `legible-duckdb` | DuckDB | Optimized for DuckDB local analytics |
| `legible-mssql` | SQL Server | Optimized for Microsoft SQL Server |
| `legible-oracle` | Oracle | Optimized for Oracle databases |
| `legible-trino` | Trino | Optimized for Trino distributed SQL |
| `legible-redshift` | Redshift | Optimized for Amazon Redshift |
| `legible-databricks` | Databricks | Optimized for Databricks lakehouse |
| `legible-athena` | Athena | Optimized for Amazon Athena |
| `legible-analyst` | All connectors | Analysis-focused with additional tools |

Blueprints are stored in `~/.legible/blueprints/` or bundled with the CLI binary.

## Blueprint Spec

A blueprint is a directory containing a `blueprint.yaml` file:

```
my-blueprint/
├── blueprint.yaml
├── Dockerfile           # Optional: custom sandbox build
└── policies/
    └── legible-sandbox.yaml
```

### Full Example

```yaml
version: "0.1.0"
min_openshell_version: "0.1.0"
description: |
  Default Legible agent blueprint. Provides a sandboxed AI coding agent
  with MCP access to your Legible project's semantic layer.

supported_connectors:
  - POSTGRES
  - BIG_QUERY
  - SNOWFLAKE
  - MYSQL
  - DUCKDB

components:
  sandbox:
    image: "legible-sandbox:latest"
    name: "legible-agent"
    forward_ports:
      - 9000
    resources:
      cpus: "4.0"
      memory: "16g"
      max_sandboxes: 20

  inference:
    profiles:
      nvidia:
        provider_type: "nvidia"
        provider_name: "nvidia-inference"
        endpoint: "https://integrate.api.nvidia.com/v1"
        model: "nvidia/nemotron-3-super-120b-a12b"
      openai:
        provider_type: "openai"
        provider_name: "openai-inference"
        endpoint: "https://api.openai.com/v1"
        model: "gpt-4o"
      anthropic:
        provider_type: "anthropic"
        provider_name: "anthropic-inference"
        endpoint: "https://api.anthropic.com/v1"
        model: "claude-sonnet-4-20250514"
      local:
        provider_type: "ollama"
        provider_name: "local-inference"
        endpoint: "http://host.docker.internal:11434/v1"
        model: "llama3.1:8b"

  mcp:
    servers:
      legible:
        transport: "streamable-http"
        url: "http://host.docker.internal:9000/mcp"

policies:
  network: "policies/legible-sandbox.yaml"
  filesystem:
    read_only:
      - /usr
      - /lib
      - /proc
      - /app
      - /etc
    read_write:
      - /home/sandbox
      - /workspace
      - /tmp
  process:
    deny_privilege_escalation: true
    run_as_user: sandbox
    run_as_group: sandbox

agent:
  type: "claude"
  allowed_types:
    - claude
    - codex
    - opencode
    - copilot
  entrypoint: "/usr/local/bin/sandbox-entrypoint.sh"
```

## Spec Reference

### Top-Level Fields

| Field | Required | Description |
|-------|----------|-------------|
| `version` | Yes | Blueprint spec version (e.g., `"0.1.0"`) |
| `min_openshell_version` | No | Minimum required OpenShell CLI version |
| `description` | Yes | Human-readable description |
| `supported_connectors` | No | List of supported data source types. Empty = all connectors. |

### `components.sandbox`

| Field | Description |
|-------|-------------|
| `image` | Container image name |
| `build.dockerfile` | Path to Dockerfile for custom builds |
| `build.context` | Docker build context path |
| `name` | Default sandbox name |
| `forward_ports` | Ports to expose from the sandbox |
| `env` | Environment variables (key-value map) |
| `resources.cpus` | CPU allocation (e.g., `"4.0"`, `"8.0"`) |
| `resources.memory` | Memory allocation (e.g., `"16g"`, `"32g"`) |
| `resources.disk` | Disk allocation |
| `resources.max_sandboxes` | Maximum concurrent sandboxes on the [gateway](/agents/gateways) |

### `components.inference`

Defines inference routing profiles. Each profile configures a different LLM provider:

| Field | Description |
|-------|-------------|
| `provider_type` | Provider type: `nvidia`, `openai`, `anthropic`, `ollama` |
| `provider_name` | Name for the OpenShell provider |
| `endpoint` | Inference API endpoint URL |
| `model` | Model identifier |

Select a profile at creation time:

```bash
legible agent create my-agent --blueprint legible-default --profile nvidia
```

If no profile is specified, Legible picks the first available in this priority order: `nvidia` → `anthropic` → `openai` → `local` → first defined.

### `components.mcp`

| Field | Description |
|-------|-------------|
| `servers.<name>.transport` | MCP transport type (usually `streamable-http`) |
| `servers.<name>.url` | MCP server URL |

### `components.tools`

| Field | Description |
|-------|-------------|
| `install` | List of packages to install in the sandbox |
| `scripts` | Named scripts available in the sandbox |
| `scripts[].name` | Script name |
| `scripts[].command` | Shell command to execute |
| `scripts[].description` | Human-readable description |

### `policies`

| Field | Description |
|-------|-------------|
| `network` | Path to network policy YAML file |
| `filesystem.read_only` | Paths mounted as read-only |
| `filesystem.read_write` | Paths mounted as read-write |
| `process.deny_privilege_escalation` | Block privilege escalation (`true`/`false`) |
| `process.run_as_user` | Container user |
| `process.run_as_group` | Container group |

### `agent`

| Field | Description |
|-------|-------------|
| `type` | Default agent type (`claude`, `codex`, `opencode`, `copilot`) |
| `allowed_types` | Agent types this blueprint supports |
| `entrypoint` | Custom entrypoint command |

## Custom Blueprints

### Creating a Blueprint

1. Create a directory with a `blueprint.yaml`:

```bash
mkdir my-blueprint
cd my-blueprint
```

2. Write the spec:

```yaml
version: "0.1.0"
description: "My custom agent blueprint"

components:
  sandbox:
    image: "my-sandbox:latest"
    resources:
      cpus: "8.0"
      memory: "32g"

  inference:
    profiles:
      openai:
        provider_type: "openai"
        provider_name: "openai-inference"
        endpoint: "https://api.openai.com/v1"
        model: "gpt-4o"

policies:
  network: "policies/my-policy.yaml"

agent:
  type: "claude"
```

3. Create the agent from your custom blueprint:

```bash
legible agent create my-agent --blueprint ./my-blueprint
```

### Installing Blueprints

Place blueprint directories in `~/.legible/blueprints/` to make them available by name:

```bash
cp -r my-blueprint ~/.legible/blueprints/my-blueprint
legible agent create my-agent --blueprint my-blueprint
```

## Auto-Provisioning

When auto-provisioning is enabled, Legible automatically selects the best blueprint for your data source. The mapping is:

| Data Source | Blueprint |
|-------------|-----------|
| PostgreSQL | `legible-postgres` |
| BigQuery | `legible-bigquery` |
| Snowflake | `legible-snowflake` |
| MySQL | `legible-mysql` |
| ClickHouse | `legible-clickhouse` |
| DuckDB | `legible-duckdb` |
| Others | `legible-default` |

If a connector-specific blueprint isn't found, `legible-default` is used as a fallback.
