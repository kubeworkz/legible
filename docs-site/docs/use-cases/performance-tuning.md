---
sidebar_position: 6
title: "Performance Tuning Agent"
---

# Performance Tuning Agent

An agent that monitors query performance, identifies bottlenecks, recommends configuration changes, and can apply tuning adjustments — all from a sandboxed environment with controlled access.

## The Problem

Database performance degrades gradually. Queries that ran in milliseconds start taking seconds as data grows, but nobody notices until users complain. Tuning requires deep expertise in query plans, memory settings, connection pooling, and workload patterns — knowledge that's scarce and expensive.

## How It Works

1. The agent connects to your database's performance views through the Legible MCP server
2. It collects slow query logs, execution plan statistics, wait events, and resource utilization metrics
3. It identifies the highest-impact bottlenecks: missing indexes, bad query plans, configuration mismatches, lock contention
4. It recommends specific changes (query rewrites, config parameters, index additions) with estimated impact
5. Optionally, it applies non-destructive tuning changes (e.g., `work_mem`, `effective_cache_size`)

## Blueprint

```yaml
agent:
  type: claude
  description: Database performance monitoring and tuning

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
  - name: monitored-db
    protocol: tcp
    port: 5432
    destination: "your-db-host.example.com"
```

## Usage

```bash
legible agent create tuner --blueprint performance-tuning --profile nvidia
legible agent connect tuner

# Inside the sandbox:
# > Show me the top 10 slowest queries in the last 24 hours
# > Analyze the execution plan for this query: SELECT ...
# > What configuration changes would improve write throughput?
# > Identify lock contention hotspots
# > Apply the recommended work_mem change on staging
```

## Analysis Areas

| Area | What the Agent Checks |
|------|----------------------|
| **Slow queries** | `pg_stat_statements` top N by total_time, mean_time, calls |
| **Query plans** | Sequential scans on large tables, nested loops on unindexed joins, sort spills to disk |
| **Configuration** | `shared_buffers`, `work_mem`, `effective_cache_size`, `random_page_cost` vs. actual hardware |
| **Connections** | Pool saturation, idle-in-transaction sessions, connection churn |
| **Locks** | Long-held locks, deadlock frequency, lock wait times |
| **I/O** | Cache hit ratio, checkpoint frequency, WAL write volume |
| **Bloat** | Table and index bloat estimation, `VACUUM` effectiveness |

## Example Report

```
PERFORMANCE REPORT — production-db — 2026-04-02
════════════════════════════════════════════════

TOP BOTTLENECKS (by estimated impact)

1. [HIGH] Query #4821 — full table scan on "events" (12M rows)
   Current: 4.2s avg | Recommended: CREATE INDEX idx_events_user_ts ON events(user_id, created_at)
   Estimated improvement: 4.2s → 12ms

2. [HIGH] shared_buffers = 128MB on 32GB host
   Recommended: ALTER SYSTEM SET shared_buffers = '8GB';
   Requires restart.

3. [MEDIUM] 847 idle-in-transaction connections (max_connections = 100)
   Recommended: Set idle_in_transaction_session_timeout = '30s'

4. [MEDIUM] Index bloat on "orders_pkey" — 62% wasted space
   Recommended: REINDEX CONCURRENTLY orders_pkey;

...
```

## Supported Databases

| Database | Performance Views |
|----------|------------------|
| PostgreSQL | `pg_stat_statements`, `pg_stat_activity`, `pg_locks`, `pg_stat_bgwriter` |
| MySQL | `performance_schema`, `sys` schema, slow query log |
| SQL Server | DMVs (`sys.dm_exec_query_stats`, `sys.dm_os_wait_stats`) |
| Oracle | AWR, ASH, `V$SQL`, `V$SESSION_WAIT` |
