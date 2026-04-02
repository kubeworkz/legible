---
sidebar_position: 8
title: "Data Quality Monitor"
---

# Data Quality Monitor

An agent that continuously validates data freshness, completeness, consistency, and accuracy — surfacing issues before they reach dashboards or downstream consumers.

## The Problem

Data quality issues are discovered late — when a dashboard shows wrong numbers or an ML model produces bad predictions. By then, the root cause has propagated through multiple pipeline stages. Teams need continuous monitoring that understands the semantic meaning of the data, not just null counts.

## How It Works

1. The agent reads your MDL models, metrics, and calculated fields from the Legible semantic layer
2. It generates validation rules based on the semantic definitions (e.g., a `revenue` metric should always be positive, a `customer_id` foreign key should always resolve)
3. It runs these checks on a schedule, comparing current data against historical baselines
4. It alerts on anomalies: freshness lag, row count drops, null rate spikes, distribution shifts

## Blueprint

```yaml
agent:
  type: claude
  description: Continuous data quality monitoring

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
legible agent create dq-monitor --blueprint data-quality --profile nvidia
legible agent connect dq-monitor

# Inside the sandbox:
# > Generate data quality rules for all models in the semantic layer
# > Check freshness of the orders table — when was the last row inserted?
# > Run a full data quality scan and show me all failures
# > Compare today's row counts against the 30-day average
# > Set up alerts for null rates exceeding 5% on any required column
```

## Validation Categories

| Category | What It Checks |
|----------|---------------|
| **Freshness** | Time since last row insert/update vs. expected schedule |
| **Volume** | Row count within expected range (±2σ of 30-day average) |
| **Completeness** | Null rates on non-nullable semantic fields |
| **Uniqueness** | Duplicate primary keys, duplicate business keys |
| **Referential integrity** | Foreign key relationships defined in MDL actually resolve |
| **Range** | Numeric fields within expected bounds (e.g., price > 0, age between 0–150) |
| **Distribution** | Statistical distribution shift detection (KS test, mean/stddev drift) |
| **Cross-source consistency** | Same metric computed from different sources should agree |

## Example Report

```
DATA QUALITY REPORT — 2026-04-02T08:00:00Z
═══════════════════════════════════════════

FAILURES (3)
  ✗ orders.freshness — Last row: 14 hours ago (threshold: 2 hours)
  ✗ customers.email — Null rate: 12.3% (threshold: 1%)
  ✗ products.price — 47 rows with negative values

WARNINGS (2)
  ⚠ orders.row_count — 23,014 today vs. 28,500 avg (−19%)
  ⚠ revenue metric — $142K today vs. $178K 7-day avg (−20%)

PASSED (28)
  ✓ All primary key uniqueness checks
  ✓ All foreign key integrity checks
  ✓ All freshness checks (except orders)
  ...

Next scan: 2026-04-02T12:00:00Z
```

## Supported Databases

Works with all 22+ Legible connectors. The agent adapts its SQL to each dialect automatically through the semantic layer.
