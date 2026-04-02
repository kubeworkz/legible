---
sidebar_position: 11
title: "Exploratory Analysis Agent"
---

# Exploratory Analysis Agent

An agent that profiles your datasets, detects anomalies, surfaces insights, and answers ad-hoc analytical questions through natural language — combining the power of an LLM with direct access to your semantic layer.

## The Problem

Exploratory data analysis is iterative: run a query, look at results, form a hypothesis, run another query. Analysts spend hours writing SQL, formatting results, and context-switching between tools. The semantic layer already encodes business logic, relationships, and metrics — but leveraging that knowledge still requires manual query writing.

## How It Works

1. The agent connects to your Legible semantic layer via MCP, gaining access to all models, metrics, calculated fields, and relationships
2. You ask questions in natural language; the agent generates SQL using the semantic layer's context (not just raw schema)
3. It profiles data distributions, detects outliers, computes correlations, and identifies trends
4. It produces formatted tables, statistical summaries, and narrative explanations
5. It remembers context within the session, so follow-up questions build on previous results

## Blueprint

```yaml
agent:
  type: claude
  description: Interactive exploratory data analysis

components:
  sandbox:
    image: ghcr.io/nvidia/openshell/sandbox-base:latest
    resources:
      cpus: "2.0"
      memory: "8g"
  inference:
    profiles:
      anthropic:
        model: claude-sonnet-4-20250514
        provider_type: anthropic
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
```

## Usage

```bash
legible agent create analyst --blueprint exploratory-analysis --profile anthropic
legible agent connect analyst

# Inside the sandbox — conversational analysis:
# > What are my top 10 customers by lifetime revenue?
# > Break that down by quarter — is there a seasonal trend?
# > Which product categories have declining revenue this year vs last?
# > Show me the correlation between order frequency and average order value
# > Profile the customers table — distributions, null rates, outliers
# > Find anomalies in the last 7 days of transaction data
```

## Key Capabilities

| Capability | Description |
|-----------|-------------|
| **Semantic-aware queries** | Uses MDL models, so "revenue" means the defined metric, not a raw column guess |
| **Data profiling** | Column distributions, cardinality, null rates, min/max/mean/median/p95 |
| **Anomaly detection** | Z-score outliers, sudden volume changes, unexpected null spikes |
| **Trend analysis** | Time-series decomposition, year-over-year comparisons, growth rates |
| **Correlation** | Pearson/Spearman correlations between numeric fields |
| **Cohort analysis** | Group customers by signup month, analyze retention and LTV by cohort |
| **Conversational context** | Follow-up questions reference previous results ("break that down by region") |

## Example Session

```
You: What does our revenue look like this quarter?

Agent: Q1 2026 revenue is $4.2M, up 12% from Q4 2025 ($3.75M).
       Month breakdown:
         January:  $1.28M  (+8% MoM)
         February: $1.35M  (+5% MoM)
         March:    $1.57M  (+16% MoM)

       The March spike is driven by enterprise deals — the top 5
       customers contributed 34% of March revenue vs. 22% average.

You: Which enterprise customers drove that spike?

Agent: Top 5 customers by March 2026 revenue:
       1. Acme Corp       — $182K  (3 large orders on Mar 15)
       2. GlobalTech Inc   — $147K  (annual renewal + expansion)
       3. DataFlow Systems — $112K  (new customer, first order Mar 3)
       4. Meridian Group   — $98K   (consistent monthly buyer)
       5. CloudFirst       — $87K   (2x their typical monthly spend)

       DataFlow Systems is a new account — worth flagging for the
       sales team as a high-value early signal.

You: Profile the orders table for anomalies in the last 7 days.

Agent: ORDERS TABLE PROFILE — Last 7 days (Mar 26 – Apr 1)
       ═══════════════════════════════════════════════════
       Rows:     3,847 (vs. 3,200 avg weekly — +20%)
       Nulls:    shipping_address: 4.2% (normal: <1%) ⚠
       Outliers: 12 orders with total > $10K (normal: 2-3 per week) ⚠
       Status:   "failed" at 4.8% (normal: 2%) ⚠

       Recommendations:
       1. Investigate the shipping_address null spike — possible
          checkout flow bug introduced this week
       2. Review the 12 high-value orders for fraud signals
       3. Check payment gateway logs for the elevated failure rate
```

## Supported Databases

Works with all 22+ Legible connectors. The agent generates dialect-appropriate SQL through the semantic layer and adapts analysis to the available data.

## Why Not Just Use the Chat UI?

The Legible web UI already supports natural language queries. The sandbox agent adds:

- **Persistent session context** — multi-turn conversations that build on previous results
- **Programmatic access** — the agent can write scripts, save results to files, chain complex analyses
- **Custom tooling** — install Python packages (pandas, scipy, matplotlib) inside the sandbox for statistical analysis
- **Automation** — schedule recurring analyses or trigger them from CI/CD pipelines
