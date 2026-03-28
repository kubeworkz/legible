---
sidebar_position: 2
title: Query Flow
---

# Query Flow

This page explains the detailed path a query takes through the system, from natural language input to data source execution.

## Natural Language → SQL

```
User: "What are the top 10 customers by revenue?"
  │
  ▼
┌────────────────────────────────────────────┐
│ 1. Legible UI (Next.js)                    │
│    POST /api/ask → AI Sv  ervice           │
└──────────────────┬─────────────────────────┘
                   ▼
┌─────────────────────────────────────────┐
│ 2. AI Service (Python/FastAPI)          │
│    a. Embed the question                │
│    b. Retrieve relevant MDL context     │
│       from Qdrant (vector search)       │
│    c. Build prompt with semantic context│
│    d. Call LLM (Gemini/OpenAI/etc.)     │
│    e. LLM returns SQL                   │
└──────────────────┬──────────────────────┘
                   ▼
┌─────────────────────────────────────────┐
│ 3. SQL Validation                       │
│    AI Service sends generated SQL to    │
│    Ibis Server for syntax validation    │
│    via dry-run endpoint                 │
└──────────────────┬──────────────────────┘
                   ▼
┌─────────────────────────────────────────┐
│ 4. Ibis Server (Python + Rust)          │
│    a. Parse SQL                         │
│    b. Resolve MDL: models → tables,     │
│       calculated fields → expressions,  │
│       relationships → JOINs             │
│    c. DataFusion plans the query        │
│    d. Generate data-source-specific SQL │
│       (e.g., PostgreSQL dialect)        │
└──────────────────┬──────────────────────┘
                   ▼
┌─────────────────────────────────────────┐
│ 5. Data Source Execution                │
│    The translated SQL runs natively on  │
│    PostgreSQL, BigQuery, Snowflake, etc.│
└──────────────────┬──────────────────────┘
                   ▼
┌─────────────────────────────────────────┐
│ 6. Results                              │
│    Flow back through the chain:         │
│    Data Source → Ibis → AI Service → UI │
│    Results displayed as table + chart   │
└─────────────────────────────────────────┘
```

## MDL (Modeling Definition Language)

The semantic layer is defined using MDL, a JSON-based schema that describes:

- **Models** — Logical tables with columns, mapped to physical tables or SQL expressions
- **Relationships** — How models connect to each other (JOIN conditions)
- **Calculated Fields** — Derived columns defined as SQL expressions
- **Metrics** — Pre-defined aggregation queries
- **Views** — Saved queries

The MDL allows the AI to generate SQL against logical model names, and the engine resolves those to actual database objects.

## Fallback Behavior

If the Rust-based engine (v3, powered by DataFusion) fails to process a query, the system falls back to the legacy Java engine (v2). This handles edge cases like certain correlated subqueries that the Rust engine doesn't yet support.
