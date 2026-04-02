---
sidebar_position: 5
title: "Schema Migration Agent"
---

# Schema Migration Agent

An agent that plans, validates, and executes database schema changes across environments — generating migration files, checking for backwards compatibility, and handling rollbacks.

## The Problem

Schema migrations are one of the riskiest database operations. A bad `ALTER TABLE` can lock production for minutes, break applications, or lose data. Teams need to review DDL changes, test them against realistic data, and have a rollback plan — all of which is manual and error-prone.

## How It Works

1. The agent connects to source and target databases through the Legible MCP server
2. It compares schemas (tables, columns, indexes, constraints, functions) and generates a diff
3. It produces forward and rollback migration scripts with safety checks (lock timeouts, batch operations for large tables)
4. It can execute migrations in a staging environment first and report results before promoting to production

## Blueprint

```yaml
agent:
  type: claude
  description: Schema migration planning, validation, and execution

components:
  sandbox:
    image: ghcr.io/nvidia/openshell/sandbox-base:latest
    resources:
      cpus: "2.0"
      memory: "4g"
  inference:
    profiles:
      anthropic:
        model: claude-sonnet-4-20250514
        provider_type: anthropic

policies:
  network: policy.yaml
```

**Network policy**:
```yaml
version: "1.0"
rules:
  - name: legible-mcp
    protocol: tcp
    port: 443
    destination: "your-legible-instance.example.com"
  - name: staging-db
    protocol: tcp
    port: 5432
    destination: "staging-db.example.com"
  - name: production-db
    protocol: tcp
    port: 5432
    destination: "production-db.example.com"
```

## Usage

```bash
legible agent create migrator --blueprint schema-migration --profile anthropic
legible agent connect migrator

# Inside the sandbox:
# > Compare the staging and production schemas and show me the diff
# > Generate a migration to add a "status" column to the orders table
# > Check if this migration is backwards compatible with the current app
# > Execute the migration on staging, report results, then promote to prod
# > Generate a rollback script for the last migration
```

## Key Capabilities

| Capability | Description |
|-----------|-------------|
| **Schema diffing** | Compare two databases or a database against a target DDL file |
| **Safe DDL generation** | `SET lock_timeout`, `CREATE INDEX CONCURRENTLY`, batched `ALTER TABLE` |
| **Backwards compatibility** | Detect breaking changes (column drops, type narrowing, NOT NULL on existing data) |
| **Rollback scripts** | Auto-generated reverse migrations for every forward change |
| **Multi-environment** | Execute on staging first, validate, then promote to production |
| **Migration frameworks** | Output compatible with Knex, Flyway, Alembic, or raw SQL |

## Example Output

```sql
-- Migration: add_status_to_orders
-- Generated: 2026-04-02T10:30:00Z
-- Backwards compatible: YES

BEGIN;

SET lock_timeout = '5s';

ALTER TABLE orders
  ADD COLUMN status VARCHAR(20) DEFAULT 'pending' NOT NULL;

CREATE INDEX CONCURRENTLY idx_orders_status
  ON orders (status);

COMMIT;

-- Rollback:
-- ALTER TABLE orders DROP COLUMN status;
```

## Supported Databases

| Database | Schema Comparison Source |
|----------|------------------------|
| PostgreSQL | `information_schema`, `pg_catalog` |
| MySQL | `INFORMATION_SCHEMA.COLUMNS`, `INFORMATION_SCHEMA.TABLES` |
| SQL Server | `sys.columns`, `sys.tables`, `sys.indexes` |
| Snowflake | `INFORMATION_SCHEMA.COLUMNS` |
