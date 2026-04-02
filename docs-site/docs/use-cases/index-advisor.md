---
sidebar_position: 2
title: "Automated Index Advisor"
---

# Automated Index Advisor

An agent that continuously analyzes query execution patterns, identifies missing or redundant indexes, and recommends changes — all within a locked-down sandbox that can only read database statistics.

## The Problem

DBAs spend hours reviewing `pg_stat_user_indexes`, `EXPLAIN ANALYZE` output, and slow query logs to decide which indexes to add or drop. The analysis is repetitive and easy to miss on large schemas.

## How It Works

```
┌─────────────────────────────────┐
│  OpenShell Sandbox              │
│  ┌───────────────┐              │
│  │ Claude Code   │──── MCP ────▶│  Legible Semantic Layer
│  │ (Agent)       │              │  ├─ Models (tables + joins)
│  └───────┬───────┘              │  ├─ Metrics (query patterns)
│          │                      │  └─ Calculated Fields
│          ▼                      │
│  NemoClaw Policy                │
│  ├─ Allow: Legible MCP endpoint │
│  ├─ Allow: DB stats (read-only) │
│  └─ Deny: everything else       │
└─────────────────────────────────┘
```

1. The agent connects to your database's statistics views through the Legible MCP server
2. It pulls `pg_stat_user_indexes`, `pg_stat_user_tables`, and recent slow query logs
3. It identifies unused indexes (zero scans), missing indexes (sequential scans on filtered columns), and duplicate indexes
4. It outputs a ranked list of `CREATE INDEX` / `DROP INDEX` statements with estimated impact

## Blueprint

```yaml
agent:
  type: claude
  description: Automated index analysis and recommendation

components:
  sandbox:
    image: ghcr.io/nvidia/openshell/sandbox-base:latest
    resources:
      cpus: "2.0"
      memory: "4g"
  inference:
    profiles:
      nvidia:
        model: meta/llama-3.3-70b-instruct
        provider_type: nvidia
      anthropic:
        model: claude-sonnet-4-20250514
        provider_type: anthropic

policies:
  network: policy.yaml
```

**Network policy** (`policy.yaml`):
```yaml
version: "1.0"
rules:
  - name: legible-mcp
    protocol: tcp
    port: 443
    destination: "your-legible-instance.example.com"
  - name: db-stats-readonly
    protocol: tcp
    port: 5432
    destination: "your-db-host.example.com"
```

## Usage

```bash
# Create the agent
legible agent create index-advisor --blueprint index-advisor --profile anthropic

# Connect and start the analysis
legible agent connect index-advisor

# Inside the sandbox, the agent can immediately run:
# > Analyze the orders table for missing indexes
# > Show me unused indexes across all schemas
# > Generate a migration script for the top 5 index recommendations
```

## Supported Databases

| Database | Stats Source |
|----------|-------------|
| PostgreSQL | `pg_stat_user_indexes`, `pg_stat_user_tables` |
| MySQL | `INFORMATION_SCHEMA.STATISTICS`, `performance_schema` |
| SQL Server | `sys.dm_db_index_usage_stats` |
| Oracle | `DBA_INDEX_USAGE`, `V$SQL_PLAN` |

## What the Agent Produces

- A prioritized list of index recommendations with estimated query improvement
- `CREATE INDEX` and `DROP INDEX` DDL ready to review
- A summary report explaining the reasoning behind each recommendation
- Optional: a PR-ready migration file if connected to a Git repository
