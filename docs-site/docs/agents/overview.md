---
sidebar_position: 1
title: Overview
---

# Agents

Legible agents are AI coding assistants that run inside **sandboxed containers** with pre-configured access to your data through the semantic layer. Each agent gets its own isolated environment with credentials, network policies, and MCP connectivity — so it can query your data without direct database access.

## How It Works

```
┌───────────────┐      ┌──────────────────────────────────┐
│  legible CLI  │────▶|     OpenShell Gateway (per org)  │
└───────────────┘      │  ┌────────┐ ┌────────┐ ┌──────┐  │
                       │  │Agent A │ │Agent B │ │ ...  │  │
                       │  │(Claude)│ │(Codex) │ │      │  │
                       │  └───┬────┘ └───┬────┘ └──────┘  │
                       └──────┼──────────┼────────────────┘
                              │          │
                       ┌──────▼──────────▼───────────────────┐
                       │       Legible MCP Server            │
                       │    (Semantic Layer + Query Engine)  │
                       └─────────────────────────────────────┘
```

1. You create an agent with `legible agent create`
2. The CLI provisions a sandbox via [OpenShell](/agents/openshell) — an NVIDIA container-isolation runtime
3. The sandbox connects to your Legible project through the [MCP server](/guides/mcp-integration)
4. All sandboxes in an organization share a single [gateway](/agents/gateways) that manages resources

## Agent Types

Legible supports several AI agent runtimes:

| Type | Description |
|------|-------------|
| `claude` | Anthropic Claude Code (default) |
| `codex` | OpenAI Codex CLI |
| `opencode` | Open-source OpenCode agent |
| `copilot` | GitHub Copilot agent |

## Quick Start

### Prerequisites

- **Legible CLI** — [Install the CLI](/guides/cli)
- **OpenShell** — Container isolation runtime (see [OpenShell setup](/agents/openshell))
- **Docker** — Required by OpenShell for running sandboxes
- A Legible project with at least one connected data source

### Create Your First Agent

```bash
# Log in and select a project
legible login
legible project use 1

# Create a Claude agent
legible agent create my-analyst

# Or create from a blueprint with a specific inference profile
legible agent create my-analyst --blueprint legible-default --profile anthropic
```

The CLI will:
1. Ensure an [org-scoped gateway](/agents/gateways) exists (creates one if needed)
2. Set up a credentials provider with your Legible API key
3. Create an isolated sandbox container
4. Apply a network policy restricting traffic to Legible endpoints

### Interact with the Agent

```bash
# Open a shell inside the agent's sandbox
legible agent connect my-analyst

# View agent logs
legible agent logs my-analyst --tail

# List all running agents
legible agent list
```

### Stop an Agent

```bash
legible agent stop my-analyst
```

## Resource Limits

Each agent sandbox runs with configurable resource limits:

```bash
legible agent create my-analyst --cpus 8.0 --memory 32g
```

When using a [blueprint](/agents/blueprints), resource limits are defined in the blueprint spec and applied automatically.

| Resource | Default | Flag |
|----------|---------|------|
| CPU cores | 4.0 | `--cpus` |
| Memory | 16g | `--memory` |

## Sandbox Naming

Sandboxes are namespaced by organization to prevent collisions across teams:

```
{org-slug}-{agent-name}
```

For example, if your org slug is `acme` and you create an agent called `analyst`, the sandbox name is `acme-analyst`.

## What's Next

- [OpenShell](/agents/openshell) — Install and configure the container runtime
- [Blueprints](/agents/blueprints) — Pre-configured agent templates for different data sources
- [Gateways](/agents/gateways) — Org-scoped gateway management and resource allocation
