---
sidebar_position: 5
title: SQL Syntax
---

# Wren SQL

Legible uses **Wren SQL**, a SQL dialect based on ANSI SQL and optimized for the semantic engine. When you ask questions or write queries, Wren SQL is used internally by the AI to generate results.

## How It Works

1. You ask a question in natural language
2. The AI generates a **Wren SQL** query against your data models
3. The semantic engine translates it to **native SQL** for your data source (PostgreSQL, BigQuery, etc.)
4. Results are returned to the UI

## Key Differences from Standard SQL

Wren SQL operates on your **data models** rather than raw database tables:

- **Table names** refer to model names you defined, not database table names
- **Column names** include calculated fields and relationships
- **Joins** are inferred from defined relationships

## Viewing Full SQL

When you receive a query result, you can inspect the SQL in two ways:

### Wren SQL View

The default view shows the Wren SQL query — the semantic query against your models. This is useful for understanding the AI's intent.

### Original SQL View

Click **"Show original SQL"** to see the native SQL that was actually executed against your database. This is the translated query in your data source's dialect (e.g., PostgreSQL syntax, BigQuery syntax).

:::tip
Use the original SQL view when you want to:
- Debug query performance
- Copy the query to run directly in your database client
- Verify the exact SQL being executed
:::

## Writing Custom SQL

When creating Question-SQL pairs or adjusting AI-generated SQL, write in Wren SQL format:

```sql
-- Reference model names, not table names
SELECT customer_name, total_orders
FROM customers
WHERE region = 'US'
ORDER BY total_orders DESC
LIMIT 10
```

The semantic engine handles translating this to the appropriate native SQL for your connected data source.
