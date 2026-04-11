---
sidebar_position: 4
title: DB2 for i Integration
---

# DB2 for i Integration

Connect AI agents to IBM DB2 for i (AS/400) databases using the [mcp-server-db2i](https://github.com/Strom-Capital/mcp-server-db2i) MCP server. This provides read-only SQL access, schema inspection, and table metadata directly to agents running in Legible.

## Prerequisites

- An IBM i system running V7R3 or later (V7R5 recommended)
- Network access from your Legible host to the IBM i system (default port 446)
- IBM i user credentials with read access to the target schemas

## Setup

### 1. Enable the Docker Service

Uncomment the `mcp-server-db2i` service in `docker/docker-compose.yaml`:

```yaml
mcp-server-db2i:
  image: ghcr.io/strom-capital/mcp-server-db2i:latest
  restart: on-failure
  ports:
    - 127.0.0.1:${DB2I_MCP_PORT:-9002}:3000
  environment:
    DB2I_HOSTNAME: ${DB2I_HOSTNAME}
    DB2I_PORT: ${DB2I_PORT:-446}
    DB2I_USERNAME: ${DB2I_USERNAME}
    DB2I_PASSWORD: ${DB2I_PASSWORD}
    DB2I_DATABASE: ${DB2I_DATABASE:-*LOCAL}
    DB2I_SCHEMA: ${DB2I_SCHEMA:-}
    DB2I_JDBC_OPTIONS: ${DB2I_JDBC_OPTIONS:-naming=sql;date format=iso}
    MCP_TRANSPORT: http
    MCP_HTTP_PORT: "3000"
    MCP_HTTP_HOST: 0.0.0.0
    MCP_AUTH_MODE: ${DB2I_MCP_AUTH_MODE:-token}
    MCP_AUTH_TOKEN: ${DB2I_MCP_AUTH_TOKEN:-}
    MCP_SESSION_MODE: stateless
    LOG_LEVEL: ${DB2I_LOG_LEVEL:-info}
    QUERY_DEFAULT_LIMIT: ${DB2I_QUERY_DEFAULT_LIMIT:-1000}
    QUERY_MAX_LIMIT: ${DB2I_QUERY_MAX_LIMIT:-10000}
  networks:
    - wren
```

### 2. Configure Environment Variables

Add to your `docker/.env` file:

```bash
# Required — IBM i connection
DB2I_HOSTNAME=your-ibm-i-host.com
DB2I_USERNAME=your-username
DB2I_PASSWORD=your-password

# Optional — defaults shown
DB2I_PORT=446
DB2I_DATABASE=*LOCAL
DB2I_SCHEMA=your-default-schema

# MCP server auth (generate token with: openssl rand -hex 32)
DB2I_MCP_AUTH_TOKEN=your-generated-token
```

### 3. Start the Service

```bash
docker-compose --env-file .env up -d mcp-server-db2i
```

Verify it's running:

```bash
curl http://localhost:9002/mcp
```

## Using with Agents

### Blueprint

Create an agent with the `legible-db2i` blueprint:

```bash
legible agent create my-db2i-agent --blueprint legible-db2i
```

This configures the agent sandbox with access to both the Legible semantic layer MCP server (port 9000) and the DB2i MCP server (port 9002).

### Direct MCP Configuration

To add DB2i access to any agent manually, add the server to your MCP client config:

```json
{
  "mcpServers": {
    "legible": {
      "url": "http://localhost:9000/mcp"
    },
    "db2i": {
      "url": "http://localhost:9002/mcp"
    }
  }
}
```

## Available Tools

The DB2i MCP server provides these tools:

| Tool | Description |
|------|-------------|
| `execute_query` | Execute read-only SELECT queries |
| `list_schemas` | List schemas/libraries (with optional filter) |
| `list_tables` | List tables in a schema (with optional filter) |
| `describe_table` | Get detailed column information |
| `list_views` | List views in a schema (with optional filter) |
| `list_indexes` | List SQL indexes for a table |
| `get_table_constraints` | Get primary keys, foreign keys, unique constraints |

### Filter Syntax

The `list_schemas`, `list_tables`, and `list_views` tools support pattern matching:

- `CUST` — Contains "CUST"
- `CUST*` — Starts with "CUST"
- `*LOG` — Ends with "LOG"

### Example Prompts

Once connected, try asking the agent:

- "List all schemas that contain 'PROD'"
- "Show me the tables in schema MYLIB"
- "Describe the columns in MYLIB/CUSTOMERS"
- "What indexes exist on the ORDERS table?"
- "Run this query: SELECT * FROM MYLIB.CUSTOMERS WHERE STATUS = 'A'"

## Security

The DB2i MCP server is **read-only by design** — only SELECT queries are allowed. Additional safeguards:

- **Token authentication** is enabled by default (`MCP_AUTH_MODE=token`). Set `DB2I_MCP_AUTH_TOKEN` to a strong random value.
- **Query limits** cap result sizes (default 1,000 rows, max 10,000).
- **Rate limiting** can be configured via `RATE_LIMIT_MAX_REQUESTS` (default 100 per 15 min).
- The service only binds to `127.0.0.1` on the host — it's not exposed to the network.
- Credentials are passed via environment variables, never stored in config files.

## Configuration Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `DB2I_HOSTNAME` | — | IBM i hostname or IP (required) |
| `DB2I_USERNAME` | — | IBM i username (required) |
| `DB2I_PASSWORD` | — | IBM i password (required) |
| `DB2I_PORT` | `446` | DRDA port |
| `DB2I_DATABASE` | `*LOCAL` | Database name |
| `DB2I_SCHEMA` | — | Default schema/library |
| `DB2I_JDBC_OPTIONS` | `naming=sql;date format=iso` | Additional JDBC options |
| `DB2I_MCP_PORT` | `9002` | Host port for MCP endpoint |
| `DB2I_MCP_AUTH_MODE` | `token` | Auth mode: `required`, `token`, or `none` |
| `DB2I_MCP_AUTH_TOKEN` | — | Static auth token (for `token` mode) |
| `DB2I_LOG_LEVEL` | `info` | Log level: `debug`, `info`, `warn`, `error` |
| `DB2I_QUERY_DEFAULT_LIMIT` | `1000` | Default row limit |
| `DB2I_QUERY_MAX_LIMIT` | `10000` | Maximum row limit |

## Troubleshooting

**Connection refused**: Verify `DB2I_HOSTNAME` is reachable from the Docker host and port 446 is open.

**Authentication failed**: Check `DB2I_USERNAME` and `DB2I_PASSWORD`. The IBM i account must have JDBC access enabled.

**No schemas found**: The user may not have `*USE` authority on the target libraries. Try setting `DB2I_SCHEMA` to a specific library.

**Timeout errors**: IBM i systems behind VPNs or firewalls may need larger timeouts. Add `login timeout=30` to `DB2I_JDBC_OPTIONS`.
