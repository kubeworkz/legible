---
sidebar_position: 4
title: Gateways
---

# Gateways

Each organization in Legible gets a single **gateway** — a shared OpenShell instance that hosts all agent sandboxes for that org. Gateways manage resource allocation, track sandbox counts, and provide a single control point for the org's agent infrastructure.

## How Gateways Work

```
Organization: Acme Corp
┌─────────────────────────────────────────────┐
│  Gateway (ID: 1)                            │
│  Status: running                            │
│  Resources: 4 CPUs, 16GB RAM                │
│  Sandboxes: 3 / 20 max                      │
│                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ analyst  │ │ debugger │ │ reporter │    │
│  │ (Claude) │ │ (Codex)  │ │ (Claude) │    │
│  └──────────┘ └──────────┘ └──────────┘    │
└─────────────────────────────────────────────┘
```

- **One gateway per org** — All agents in the organization share the same gateway
- **Automatic provisioning** — When you create an agent, the CLI automatically creates a gateway if one doesn't exist
- **Sandbox tracking** — The gateway tracks how many sandboxes are running against its configured maximum

## Gateway Lifecycle

### Automatic Creation

When you run `legible agent create`, the CLI checks if your org already has a gateway:

```
Creating agent "my-analyst" (type: claude, sandbox: acme-analyst)...
  Ensuring org gateway... OK (gateway 1)
  Setting up credentials provider... OK
  Creating sandbox... OK
  Applying network policy... OK
```

If no gateway exists, one is created with default resource limits.

### Manual Creation

You can also create a gateway explicitly to set custom resource limits:

```bash
legible gateway create --cpus 8.0 --memory 32g --max-sandboxes 50
```

### Checking Status

```bash
# Show the gateway for your current org
legible gateway status

# Show detailed info for a specific gateway
legible gateway info 1
```

Example output:

```
Gateway for organization "Acme Corp":
  ID:             1
  Status:         running
  Endpoint:       localhost
  Port:           8080
  CPUs:           4.0
  Memory:         16g
  Sandboxes:      3 / 20
  Version:        0.1.0
  Last Health:    2026-04-01T10:30:00Z
```

### Deleting a Gateway

```bash
legible gateway delete 1
```

:::warning
Deleting a gateway does not automatically stop its sandboxes. Stop all agents first with `legible agent stop`.
:::

## CLI Commands

| Command | Description |
|---------|-------------|
| `legible gateway status` | Show the gateway for your current org |
| `legible gateway list` | List all running gateways |
| `legible gateway info <id>` | Show detailed gateway information |
| `legible gateway create` | Create a gateway for your org |
| `legible gateway update <id>` | Update gateway status or properties |
| `legible gateway delete <id>` | Delete a gateway |

The `gateway` command also accepts the aliases `gateways` and `gw`:

```bash
legible gw status
legible gateways list
```

## Resource Limits

Gateways have configurable resource limits that apply to the backing OpenShell instance:

| Resource | Default | Flag | Description |
|----------|---------|------|-------------|
| CPUs | 4.0 | `--cpus` | CPU cores allocated to the gateway |
| Memory | 16g | `--memory` | RAM allocated to the gateway |
| Max Sandboxes | 20 | `--max-sandboxes` | Maximum concurrent agent sandboxes |

### Setting Limits at Creation

```bash
legible gateway create --cpus 8.0 --memory 32g --max-sandboxes 50
```

### Blueprint-Driven Limits

When agents are created from [blueprints](/agents/blueprints), the resource limits come from the blueprint's `resources` section:

```yaml
components:
  sandbox:
    resources:
      cpus: "4.0"
      memory: "16g"
      max_sandboxes: 20
```

If the org already has a gateway, the existing gateway is used regardless of the blueprint's resource spec.

## Gateway Properties

| Property | Description |
|----------|-------------|
| `id` | Unique gateway identifier |
| `organizationId` | The owning organization |
| `status` | Current status: `stopped`, `running`, `failed` |
| `endpoint` | Gateway hostname or IP |
| `port` | Gateway port |
| `pid` | Process ID of the gateway process |
| `cpus` | Allocated CPU cores |
| `memory` | Allocated memory |
| `sandboxCount` | Number of active sandboxes |
| `maxSandboxes` | Maximum allowed sandboxes |
| `version` | OpenShell version |
| `errorMessage` | Last error message (if status is `failed`) |
| `lastHealthCheck` | Timestamp of the last successful health check |

## Auto-Provisioning

When Legible's auto-provisioning feature creates an agent (e.g., when a new data source is connected), it automatically:

1. Resolves the org from the project
2. Checks for an existing gateway (`getGatewayForOrganization`)
3. Creates a gateway if none exists (`createGateway`)
4. Links the agent to the gateway (`gatewayId` on the agent record)
5. Increments the gateway's sandbox count

This ensures every auto-provisioned agent has a gateway without manual intervention.

## GraphQL API

Gateways are also available through the GraphQL API:

### Queries

```graphql
# Get gateway for an organization
query {
  gatewayForOrganization(organizationId: 1) {
    id
    status
    endpoint
    sandboxCount
    maxSandboxes
  }
}

# List all running gateways
query {
  runningGateways {
    id
    organizationId
    status
    sandboxCount
  }
}
```

### Mutations

```graphql
# Create a gateway
mutation {
  createGateway(data: {
    organizationId: 1
    cpus: "8.0"
    memory: "32g"
    maxSandboxes: 50
  }) {
    id
    status
  }
}

# Update gateway status
mutation {
  updateGateway(
    where: { id: 1 }
    data: { status: "running", endpoint: "localhost", port: 8080 }
  ) {
    id
    status
  }
}
```
