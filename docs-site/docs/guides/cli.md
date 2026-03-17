---
sidebar_position: 10
title: CLI
---

# CLI

The `legible` command-line tool lets you interact with Legible from your terminal — authenticate, query data with natural language, manage models, and connect AI agents via MCP.

## Installation

Download the pre-built binary for your platform from the [GitHub releases](https://github.com/kubeworkz/legible/releases), or build from source:

```bash
git clone https://github.com/kubeworkz/legible.git
cd legible/legible-cli
make build
# Binary is at build/legible
```

### Pre-built Binaries

| Platform | Binary |
|----------|--------|
| macOS (Apple Silicon) | `legible-darwin-arm64` |
| macOS (Intel) | `legible-darwin-amd64` |
| Linux (x86_64) | `legible-linux-amd64` |
| Linux (ARM64) | `legible-linux-arm64` |
| Windows | `legible-windows-amd64.exe` |

Move the binary to somewhere in your `PATH` and rename it to `legible`:

```bash
# Example for Linux x86_64
chmod +x legible-linux-amd64
sudo mv legible-linux-amd64 /usr/local/bin/legible
```

## Quick Start

### 1. Log In

Connect the CLI to your Legible server:

```bash
legible login
```

You'll be prompted for:
- **Endpoint** — Your Legible server URL (e.g. `https://legible.kubeworkz.io`)
- **API Key** — An organization API key (`osk-...`) created in the UI under **Settings → API Keys**

The CLI validates credentials against the server, then saves them to `~/.legible/config.yaml`.

You can also log in non-interactively:

```bash
legible login --endpoint https://legible.kubeworkz.io --api-key osk-your-key-here
```

### 2. Select a Project

List available projects and select one:

```bash
legible project list
legible project use 1
```

All subsequent commands operate on the selected project.

### 3. Ask a Question

Ask a natural language question and get SQL + results + a summary:

```bash
legible ask "What are the top 10 customers by revenue?"
```

Or just generate SQL without executing:

```bash
legible sql "How many orders were placed last month?"
```

### 4. Run SQL Directly

Execute Legible SQL against your semantic model:

```bash
legible run-sql "SELECT * FROM customers LIMIT 10"
```

## Configuration

The CLI stores configuration in `~/.legible/config.yaml`:

```yaml
endpoint: https://legible.kubeworkz.io
api_key: osk-abc123...
project_id: "1"
```

View or update individual values:

```bash
legible config get                    # Show all values
legible config get endpoint           # Show one value
legible config set endpoint https://legible.kubeworkz.io
legible config set api-key osk-new-key
legible config set project-id 2
```

## Connecting to a Database (End-to-End)

This walks through the full flow — from a fresh CLI install to querying a live database.

### Prerequisites

- A running Legible instance (see [Installation](/getting-started/installation))
- A database you want to connect (PostgreSQL, MySQL, BigQuery, etc.)
- An API key from **Settings → API Keys** in the UI

### Step 1: Authenticate

```bash
legible login --endpoint https://your-legible-host.com --api-key osk-your-key
```

### Step 2: Select Your Project

```bash
legible project list
# ID  NAME           DATA SOURCE  MODELS  DISPLAY NAME
# 1   my_project     POSTGRES     5       My Project

legible project use 1
```

### Step 3: Verify the Connection

```bash
legible whoami
# Endpoint:     https://your-legible-host.com
# User:         admin@example.com
# Organization: My Org (ID: 1)
# Projects:     1
#               - My Project
```

### Step 4: Check Deployed Models

```bash
legible model list
# ID  NAME                    SOURCE TABLE              FIELDS  CACHED  DESCRIPTION
# 1   customers               public.customers          8       No
# 2   orders                  public.orders             12      No
# 3   order_items             public.order_items        6       No
```

### Step 5: Query Your Data

**Natural language:**

```bash
legible ask "What are the top 5 customers by total order value?"
```

**Direct SQL:**

```bash
legible run-sql 'SELECT customer_name, SUM(order_total) as total FROM orders GROUP BY 1 ORDER BY 2 DESC LIMIT 5'
```

**Generate SQL only (no execution):**

```bash
legible sql "Show revenue by month for the last year" --dialect
```

### Step 6: Deploy Model Changes

After making model changes in the UI, deploy them to the engine:

```bash
legible deploy
legible deploy status
```

## Using with MCP

The CLI works alongside the [MCP server](/guides/mcp-integration) to enable AI agent access to your data.

### Generate a Project API Key

Create a project-scoped API key for MCP authentication:

```bash
legible project-key create "MCP Agent Key"
# ⚠ Save this key — it won't be shown again:
# psk-abc123...
```

### Configure an AI Agent

Use the project key to connect Claude Desktop, Cursor, or Cline to the MCP server:

**Claude Desktop** (`~/.claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "legible": {
      "url": "https://your-legible-host.com:9000/mcp",
      "headers": {
        "Authorization": "Bearer psk-your-project-key"
      }
    }
  }
}
```

**Cursor** — Add an MCP server in settings with URL `https://your-legible-host.com:9000/mcp` and the Bearer token header.

**VS Code Copilot** — Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "legible": {
      "url": "https://your-legible-host.com:9000/mcp",
      "headers": {
        "Authorization": "Bearer psk-your-project-key"
      }
    }
  }
}
```

### Verify MCP via the CLI

List your project keys to confirm they're active:

```bash
legible project-key list
# ID  NAME            KEY PREFIX  CREATED     STATUS
# 1   MCP Agent Key   psk-abc1    2026-03-17  active
```

## Command Reference

### Authentication

| Command | Description |
|---------|-------------|
| `legible login` | Interactive login (endpoint + API key) |
| `legible whoami` | Show current user and organization |
| `legible config get` | Display configuration |
| `legible config set <key> <value>` | Update a configuration value |

### Projects

| Command | Description |
|---------|-------------|
| `legible project list` | List all projects |
| `legible project use <id>` | Set the active project |
| `legible project current` | Show the current project |
| `legible project info [id]` | Show project details |
| `legible project create <name>` | Create a project |
| `legible project update [id]` | Update project settings |
| `legible project delete <id>` | Delete a project |

### Querying

| Command | Description |
|---------|-------------|
| `legible ask <question>` | Ask in natural language → SQL + results + summary |
| `legible sql <question>` | Generate SQL from natural language (no execution) |
| `legible run-sql <sql>` | Execute Legible SQL directly |
| `legible summary -q <question> -s <sql>` | Generate a summary from question + SQL |
| `legible chart -q <question> -s <sql>` | Generate a Vega-Lite chart spec |

### Models & Schema

| Command | Description |
|---------|-------------|
| `legible model list` | List models in the project |
| `legible model describe <id>` | Show model details |
| `legible model fields <id>` | List columns/fields of a model |
| `legible view list` | List views |
| `legible view show <id>` | Show view details |
| `legible view create --name <n> --response-id <id>` | Create a view from a thread response |
| `legible relation list` | List relationships |
| `legible relation create` | Create a relationship |
| `legible calc-field list <model-id>` | List calculated fields |
| `legible calc-field create` | Create a calculated field |

### Knowledge

| Command | Description |
|---------|-------------|
| `legible sql-pair list` | List question-SQL pairs |
| `legible sql-pair create -q <question> -s <sql>` | Create a SQL pair |
| `legible instruction list` | List instructions |
| `legible instruction create --text <text>` | Create an instruction |

### Deployment

| Command | Description |
|---------|-------------|
| `legible deploy` | Deploy model changes to the engine |
| `legible deploy status` | Show current deployment status |

### API Keys

| Command | Description |
|---------|-------------|
| `legible api-key list` | List organization API keys |
| `legible api-key create <name>` | Create an org API key (`osk-...`) |
| `legible project-key list` | List project API keys |
| `legible project-key create <name>` | Create a project API key (`psk-...`) |

### Threads & History

| Command | Description |
|---------|-------------|
| `legible thread list` | List conversation threads |
| `legible thread show <id>` | Show a thread with all responses |
| `legible history list` | View API request history |

### Global Flags

| Flag | Description |
|------|-------------|
| `--json` | Output results as JSON (works with any command) |
