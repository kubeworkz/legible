---
sidebar_position: 3
title: MCP Integration
---

# MCP Integration

The **Model Context Protocol (MCP)** server allows AI agents like Claude, Cursor, and Cline to interact directly with your data through Legible.

## What is MCP?

MCP is an open protocol that standardizes how AI applications connect to external data and tools. Legible's MCP server exposes your semantic model and query capabilities as MCP tools that any compatible AI agent can use.

## Setup

The MCP server runs as part of the Ibis Server and is enabled by default in Docker Compose.

### Ports

| Port | Purpose |
|------|---------|
| 9000 | MCP Streamable HTTP endpoint |
| 9001 | MCP Configuration Web UI |

### Environment Variables

In `docker/.env`:

```bash
MCP_SERVER_PORT=9000
MCP_WEB_UI_PORT=9001
```

In the `ibis-server` service:

```bash
ENABLE_MCP_SERVER=true
MCP_TRANSPORT=streamable-http
MCP_HOST=0.0.0.0
MCP_PORT=9000
```

## MCP Web UI

Access the configuration UI at [http://localhost:9001](http://localhost:9001) to:

- **Toggle Read-only Mode** — Prevent the AI agent from modifying your MDL or discovering raw schemas
- **View MDL Status** — See the deployed semantic model
- **Configure Connection** — Set data source credentials
- **Edit MDL** — Modify the semantic model inline

## Connecting AI Agents

### Claude Desktop

Add to your Claude Desktop MCP config (`~/.claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "legible": {
      "url": "http://localhost:9000/mcp"
    }
  }
}
```

### Cursor

In Cursor settings, add an MCP server with:
- **URL**: `http://localhost:9000/mcp`
- **Transport**: Streamable HTTP

### Cline (VS Code)

Add to your Cline MCP settings:

```json
{
  "mcpServers": {
    "legible": {
      "url": "http://localhost:9000/mcp"
    }
  }
}
```

## Available MCP Tools

The MCP server exposes these tools to AI agents:

| Tool | Description |
|------|-------------|
| `query` | Execute SQL against the semantic model |
| `dry_run` | Validate SQL without executing |
| `get_manifest` | Retrieve the current MDL |
| `deploy` | Deploy an updated MDL |
| `deploy_manifest` | Deploy a complete manifest |
| `list_remote_tables` | Discover tables in the data source |
| `list_remote_constraints` | Discover table constraints |

In **read-only mode**, `deploy`, `deploy_manifest`, `list_remote_tables`, and `list_remote_constraints` are disabled.

## Authentication (Self-Hosted)

For self-hosted deployments with API key authentication:

1. Generate a Project API Key in **Settings → MCP Connection**
2. Use the key as a Bearer token:

```bash
curl -X POST http://localhost:9000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer psk-your-api-key" \
  -d '{"jsonrpc":"2.0","method":"initialize",...}'
```

For Claude Desktop with authentication:

```json
{
  "mcpServers": {
    "legible": {
      "url": "http://localhost:9000/mcp",
      "headers": {
        "Authorization": "Bearer psk-your-api-key"
      }
    }
  }
}
```

## Rate Limiting

MCP requests can be rate-limited per API key:

- **RPM** (Requests Per Minute) — Sliding window
- **RPD** (Requests Per Day) — Sliding window

When rate limited, the server returns HTTP 429 with a `Retry-After` header.
