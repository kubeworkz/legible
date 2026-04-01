---
sidebar_position: 2
title: OpenShell
---

# OpenShell

[OpenShell](https://github.com/NVIDIA/OpenShell) is NVIDIA's open-source container isolation runtime that Legible uses to run AI agents in secure sandboxes. Each agent sandbox is a lightweight container with controlled network access, filesystem isolation, and resource limits.

## Installation

Install the OpenShell CLI:

```bash
curl -LsSf https://raw.githubusercontent.com/NVIDIA/OpenShell/main/install.sh | sh
```

Verify the installation:

```bash
openshell --version
```

### Requirements

- **Docker** — OpenShell uses Docker to run sandbox containers
- **Linux or macOS** — Native support; Windows works via WSL2

## How Legible Uses OpenShell

When you run `legible agent create`, the CLI orchestrates several OpenShell commands behind the scenes:

1. **Provider creation** — Sets up a credentials provider with your Legible API key, project ID, and MCP endpoint
2. **Sandbox creation** — Creates an isolated container from a sandbox image or blueprint
3. **Policy enforcement** — Applies a network policy that restricts the sandbox to Legible endpoints only

You don't need to call OpenShell directly — the `legible agent` commands handle everything. But understanding the underlying commands helps with debugging and advanced usage.

## OpenShell Commands

### Providers

Providers inject credentials and environment variables into sandboxes:

```bash
# Create a provider (done automatically by legible agent create)
openshell provider create \
  --name legible-acme-analyst \
  --type custom \
  --env LEGIBLE_ENDPOINT=https://legible.example.com \
  --env LEGIBLE_API_KEY=osk-your-key \
  --env LEGIBLE_PROJECT_ID=1 \
  --env LEGIBLE_MCP_ENDPOINT=http://host.docker.internal:9000/mcp

# List providers
openshell provider list
```

### Sandboxes

Sandboxes are the isolated containers where agents run:

```bash
# Create a sandbox (done automatically by legible agent create)
openshell sandbox create \
  --name acme-analyst \
  --from ./openshell \
  --provider legible-acme-analyst \
  --cpus 4.0 \
  --memory 16g \
  -- claude

# List running sandboxes
openshell sandbox list

# Connect to a sandbox
openshell sandbox connect acme-analyst

# Stop a sandbox
openshell sandbox stop acme-analyst
```

### Network Policies

Policies control which network endpoints a sandbox can reach:

```bash
# Apply a policy
openshell policy set acme-analyst --policy ./policies/legible-sandbox.yaml --wait

# View the active policy
openshell policy get acme-analyst
```

A typical Legible sandbox policy allows traffic to:
- Your Legible server endpoint
- The MCP server (`host.docker.internal:9000`)
- Inference provider APIs (OpenAI, Anthropic, NVIDIA)

All other outbound traffic is denied by default.

## NemoClaw Integration

[NemoClaw](https://www.nvidia.com/nemoclaw) is NVIDIA's inference routing layer. When NemoClaw is installed alongside OpenShell, Legible can configure inference provider routes automatically.

### Installation

```bash
curl -fsSL https://www.nvidia.com/nemoclaw.sh | bash
```

### How It Works

When you create an agent from a [blueprint](/agents/blueprints) that includes inference profiles, Legible checks if NemoClaw is available and automatically:

1. Creates an inference provider via `openshell provider create --type <provider_type>`
2. Routes model requests through the configured endpoint

NemoClaw is **optional** — agents work without it by using the LLM configured in your Legible AI Service. When available, it enables direct inference routing from within the sandbox.

### Checking Availability

The Legible CLI detects NemoClaw automatically:

```bash
# Check if nemoclaw is installed
which nemoclaw
```

If NemoClaw is not found, blueprint inference profiles are skipped with a message like:

```
  Configuring inference route... SKIP (nemoclaw not available)
```

## Sandbox Images

Legible ships a default sandbox image (`legible-sandbox:latest`) that includes:

- The Legible CLI, pre-authenticated
- MCP client tooling
- Common development tools (git, curl, Python, Node.js)
- An entrypoint script that initializes the agent runtime

### Custom Images

You can specify a custom sandbox image:

```bash
legible agent create my-agent --from ./my-custom-sandbox
```

Or in a [blueprint](/agents/blueprints):

```yaml
components:
  sandbox:
    image: "my-registry/custom-sandbox:v1"
```

## Troubleshooting

### OpenShell CLI not found

```
openshell CLI not found — install with: curl -LsSf https://raw.githubusercontent.com/NVIDIA/OpenShell/main/install.sh | sh
```

Ensure the OpenShell binary is on your `PATH`. After installation, you may need to restart your terminal.

### Docker not running

OpenShell requires Docker to create sandboxes. Ensure Docker is running:

```bash
docker info
```

### Sandbox cannot reach Legible server

If the agent can't connect to the MCP server, check:

1. The network policy allows the Legible endpoint
2. The Legible server is reachable from the Docker network
3. For local development, `host.docker.internal` resolves correctly (automatic on Docker Desktop; on Linux, add `--add-host=host.docker.internal:host-gateway` to Docker)

### Permission denied

Sandboxes run as a non-root `sandbox` user by default. If your custom image requires root access, adjust the blueprint's process policy:

```yaml
policies:
  process:
    deny_privilege_escalation: false
```

:::warning
Disabling privilege escalation restrictions reduces sandbox security. Only do this for trusted custom images.
:::
