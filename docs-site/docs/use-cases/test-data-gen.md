---
sidebar_position: 10
title: "Test Data Generator"
---

# Test Data Generator

An agent that generates realistic synthetic data for development and QA environments — respecting foreign keys, data types, distributions, and business rules defined in your semantic layer.

## The Problem

Developers copy production data to staging, which is slow, risky (PII exposure), and often stale. Generating synthetic data manually means writing brittle scripts that produce obviously fake data (e.g., "Test User 1", "123 Main St") that doesn't exercise realistic edge cases.

## How It Works

1. The agent reads your MDL models, relationships, and calculated fields from the Legible semantic layer
2. It understands foreign key chains, data types, NOT NULL constraints, check constraints, and business rules
3. It generates data that matches realistic distributions: proper name formats, valid email patterns, reasonable date ranges, correlated values (order totals that match line items)
4. It inserts data in dependency order (parent tables first) and respects unique constraints

## Blueprint

```yaml
agent:
  type: claude
  description: Synthetic test data generation

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

**Network policy**:
```yaml
version: "1.0"
rules:
  - name: legible-mcp
    protocol: tcp
    port: 443
    destination: "your-legible-instance.example.com"
  - name: target-db
    protocol: tcp
    port: 5432
    destination: "staging-db.example.com"
```

## Usage

```bash
legible agent create datagen --blueprint test-data-gen --profile nvidia
legible agent connect datagen

# Inside the sandbox:
# > Generate 100K realistic orders with line items and customers
# > Ensure 5% of orders have status "refunded" and 2% have status "failed"
# > Include seasonal patterns: more orders in November-December
# > Generate matching customer lifetime value metrics
# > Export as SQL INSERT statements and a CSV bundle
```

## Key Capabilities

| Capability | Description |
|-----------|-------------|
| **Schema-aware** | Reads MDL models to understand types, constraints, and relationships |
| **Dependency ordering** | Inserts parent records before children (customers → orders → line_items) |
| **Realistic distributions** | Names, emails, dates, amounts follow realistic patterns |
| **Correlated data** | Order totals = sum of line items; customer age matches birth_date |
| **Edge cases** | Configurable percentage of nulls, duplicates, boundary values |
| **Scale control** | Generate 100 rows for unit tests or 10M rows for load tests |
| **PII-free** | All data is synthetic — no production PII exposure risk |
| **Multiple formats** | SQL INSERT, CSV, JSON, Parquet output |

## Example

```
> Generate 10K customers with orders for the e-commerce schema

Generated:
  customers:   10,000 rows
  orders:      47,832 rows (avg 4.8 per customer, Poisson distributed)
  line_items: 143,496 rows (avg 3.0 per order)
  products:      500 rows (referenced by line_items)
  categories:     24 rows (referenced by products)

Distributions applied:
  • order_date: weighted toward weekdays, Nov-Dec spike
  • total_amount: log-normal, median $47.50, p99 $892
  • status: 85% completed, 8% pending, 5% refunded, 2% failed
  • customer.country: US 60%, UK 15%, DE 8%, FR 7%, other 10%

Output: ./generated/ecommerce_seed.sql (12.4 MB)
```

## Supported Targets

Works with any Legible connector. The agent generates dialect-appropriate SQL (e.g., `SERIAL` for PostgreSQL, `AUTO_INCREMENT` for MySQL, `IDENTITY` for SQL Server).
