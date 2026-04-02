---
sidebar_position: 1
title: Overview
---

# Use Cases

Legible agents running in OpenShell sandboxes can automate a wide range of database workflows — from routine DBA maintenance to complex data engineering pipelines. Each use case below pairs a **blueprint** (defining the sandbox image, inference profile, and network policy) with a real-world scenario.

These use cases are designed around the three core technologies:

- **OpenShell** — Provisions isolated, policy-enforced containers where agents execute real commands against your databases
- **NemoClaw** — Routes inference requests to the right LLM provider and enforces network boundaries so agents can only reach approved endpoints
- **Blueprints** — Declarative YAML specs that bundle sandbox config, inference profiles, and policies into a repeatable, shareable template

## Categories

### Database Administration
| Use Case | Description |
|----------|-------------|
| [Automated Index Advisor](./index-advisor) | Analyze query patterns and recommend index changes |
| [Backup & Recovery Agent](./backup-recovery) | Schedule, verify, and restore database backups |
| [Security Audit Agent](./security-audit) | Scan for misconfigurations, stale permissions, and CVEs |

### Database Maintenance
| Use Case | Description |
|----------|-------------|
| [Schema Migration Agent](./schema-migration) | Plan, validate, and execute schema changes across environments |
| [Performance Tuning Agent](./performance-tuning) | Monitor slow queries, suggest config changes, and apply tuning |

### Data Engineering
| Use Case | Description |
|----------|-------------|
| [ETL Pipeline Builder](./etl-pipeline) | Design and execute extract-transform-load pipelines between sources |
| [Data Quality Monitor](./data-quality) | Continuously validate data freshness, completeness, and consistency |

### Database Creation
| Use Case | Description |
|----------|-------------|
| [Database Provisioning Agent](./db-provisioning) | Spin up new database instances with schema, users, and seed data |
| [Test Data Generator](./test-data-gen) | Generate realistic synthetic data for development and QA environments |

### Data Analysis
| Use Case | Description |
|----------|-------------|
| [Exploratory Analysis Agent](./exploratory-analysis) | Profile datasets, detect anomalies, and surface insights through natural language |

## Quick Start

Every use case follows the same pattern:

```bash
# 1. Create an agent from the use-case blueprint
legible agent create my-agent --blueprint <blueprint-name>

# 2. Connect to the sandbox
legible agent connect my-agent

# 3. The agent has pre-configured access to your Legible MCP server
#    and can query your semantic layer immediately
```

Or select a blueprint in the Legible UI under **Agents → Create Agent → Blueprint**, then copy-paste the CLI command shown after creation.
