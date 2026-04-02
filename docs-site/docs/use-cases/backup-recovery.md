---
sidebar_position: 3
title: "Backup & Recovery Agent"
---

# Backup & Recovery Agent

An agent that manages database backup schedules, verifies backup integrity, and can perform point-in-time recovery — all orchestrated from a sandboxed environment with strict network controls.

## The Problem

Backup verification is commonly neglected. Teams configure `pg_dump` or cloud snapshots and assume they work, only discovering corruption or missing data during an actual incident. Regular restore-testing is tedious and error-prone.

## How It Works

1. The agent runs inside an OpenShell sandbox with access to your database and backup storage
2. It executes scheduled logical or physical backups, storing them to a designated location
3. It periodically restores backups into a temporary test database to verify integrity
4. It reports backup size, duration, row counts, and any discrepancies via the Legible MCP server

## Blueprint

```yaml
agent:
  type: claude
  description: Database backup management and recovery verification

components:
  sandbox:
    image: ghcr.io/nvidia/openshell/sandbox-base:latest
    resources:
      cpus: "4.0"
      memory: "8g"
  inference:
    profiles:
      nvidia:
        model: meta/llama-3.3-70b-instruct
        provider_type: nvidia

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
  - name: primary-db
    protocol: tcp
    port: 5432
    destination: "primary-db.example.com"
  - name: backup-storage
    protocol: tcp
    port: 443
    destination: "s3.amazonaws.com"
```

## Usage

```bash
legible agent create backup-agent --blueprint backup-recovery --profile nvidia
legible agent connect backup-agent

# Inside the sandbox:
# > Run a full backup of the production database
# > Verify the latest backup by restoring to a temp instance
# > Show me backup history and sizes for the last 30 days
# > Perform a point-in-time recovery to 2026-04-01T14:30:00Z
```

## Key Capabilities

| Capability | Description |
|-----------|-------------|
| **Scheduled backups** | Logical (`pg_dump`) or physical (WAL archiving, snapshots) |
| **Integrity verification** | Automated restore-and-compare against source row counts and checksums |
| **Point-in-time recovery** | Restore to a specific timestamp using WAL replay or binlog position |
| **Retention management** | Prune old backups based on configurable retention policies |
| **Alerting** | Report failures or anomalies (backup size drift, duration spikes) through MCP |

## Supported Databases

| Database | Backup Method |
|----------|---------------|
| PostgreSQL | `pg_dump`, `pg_basebackup`, WAL-G |
| MySQL | `mysqldump`, `xtrabackup`, binlog |
| SQL Server | `BACKUP DATABASE`, differential, log backups |
| MongoDB | `mongodump`, oplog-based PITR |
