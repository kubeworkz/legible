---
sidebar_position: 11
title: dbt Integration
---

# dbt Integration

The `legible` CLI can import models, columns, and relationships directly from a [dbt](https://www.getdbt.com/) project. This lets you bootstrap a Legible semantic layer from your existing dbt models without manual configuration.

## Prerequisites

Before you begin, make sure you have:

1. **A dbt project** with a valid `dbt_project.yml`
2. **A built dbt project** — run `dbt build` so that `target/manifest.json` exists
3. **A dbt catalog** — run `dbt docs generate` so that `target/catalog.json` exists
4. **The `legible` CLI** installed and authenticated (`legible login`)

## Creating a Project from dbt

Use `legible dbt create` to create a new Legible project from your dbt project:

```bash
legible dbt create --path /path/to/dbt-project
```

This will:

1. Parse your dbt project's `manifest.json` and `catalog.json`
2. Convert dbt models and columns into Legible's MDL format
3. Create a new Legible project
4. Import all models and their columns
5. Save any detected relationships between models
6. Sync model and column descriptions from dbt
7. Deploy the project
8. Write a `.legibleconfig` file to your dbt project directory

### Options

| Flag | Description |
|------|-------------|
| `--path` | Path to the dbt project root (default: `.`) |
| `--name` | Display name for the new project (default: directory name) |
| `--profile` | dbt profile name to use |
| `--target` | dbt target/output to use |
| `--include` | Regex pattern to include only matching models |
| `--exclude` | Regex pattern to exclude matching models |
| `--dry-run` | Preview which models would be imported without creating anything |
| `--include-staging-models` | Include staging/intermediate models (excluded by default) |

### Examples

```bash
# Create from current directory
legible dbt create

# Create with a custom project name
legible dbt create --path ./my-dbt-project --name "Analytics Warehouse"

# Preview which models would be imported
legible dbt create --path . --dry-run

# Only import models matching a pattern
legible dbt create --path . --include "marts_.*"

# Exclude test/staging models
legible dbt create --path . --exclude "stg_.*"

# Include staging models that are normally excluded
legible dbt create --path . --include-staging-models

# JSON output (useful for scripting)
legible dbt create --path . --dry-run --json
```

## Updating an Existing Project

After making changes to your dbt models, use `legible dbt update` to re-sync:

```bash
legible dbt update --path /path/to/dbt-project
```

This reads the project ID from the `.legibleconfig` file written during `dbt create`, re-converts your dbt project, and pushes the updated models to Legible.

:::warning
Update replaces the entire MDL in your Legible project. Any manual changes made through the UI (e.g. calculated fields, renamed columns) will be overwritten.
:::

### Options

| Flag | Description |
|------|-------------|
| `--path` | Path to the dbt project root (default: `.`) |
| `--profile` | dbt profile name to use |
| `--target` | dbt target/output to use |
| `--include` | Regex pattern to include (dry-run only) |
| `--exclude` | Regex pattern to exclude (dry-run only) |
| `--dry-run` | Preview changes without applying |
| `--yes`, `-y` | Skip the confirmation prompt |
| `--include-staging-models` | Include staging/intermediate models |

### Examples

```bash
# Update from current directory
legible dbt update

# Skip confirmation prompt
legible dbt update --path . --yes

# Preview what would change (shows add/remove/unchanged)
legible dbt update --path . --dry-run

# Preview with a different filter (does not modify saved filters)
legible dbt update --path . --dry-run --include "marts_.*"

# JSON diff output
legible dbt update --path . --dry-run --json
```

:::tip
The `--include` and `--exclude` flags on `dbt update` only work with `--dry-run`. To change filters permanently, edit the `.legibleconfig` file directly.
:::

## The `.legibleconfig` File

When you run `legible dbt create`, a `.legibleconfig` file is written to your dbt project directory. This YAML file links the dbt project to your Legible project:

```yaml
wren_project:
  id: "42"
  last_synced: "2026-03-28T12:00:00Z"
filter:
  include:
    - "marts_.*"
  exclude:
    - "stg_.*"
```

| Field | Description |
|-------|-------------|
| `wren_project.id` | The Legible project ID |
| `wren_project.last_synced` | Timestamp of the last successful sync |
| `filter.include` | List of regex patterns — only matching models are synced |
| `filter.exclude` | List of regex patterns — matching models are excluded |

You can edit this file to adjust filters between syncs. Add it to `.gitignore` if you don't want to share project linkage across your team, or commit it if everyone uses the same Legible server.

## Model Filtering

Both `dbt create` and `dbt update` support regex-based model filtering:

- **Include patterns** — If any include pattern is set, a model must match **at least one** to be included
- **Exclude patterns** — If a model matches **any** exclude pattern, it is excluded (even if it matches an include)
- **No filters** — All models are included

Patterns are matched against the dbt model name (not the full path). Standard Go regex syntax is supported.

```bash
# Include only models starting with "marts_" or "dim_"
legible dbt create --path . --include "^marts_" --include "^dim_"

# Exclude anything ending in "_tmp"
legible dbt create --path . --exclude "_tmp$"
```

## Dry Run Output

The `--dry-run` flag previews what would happen without making any changes.

For **create**, it shows a table of models and column counts:

```
MODEL           COLUMNS
marts_orders    12
marts_customers 8
dim_products    6

Total: 3 models
Relationships: 2
```

For **update**, it shows a diff comparing your dbt models against the current server state:

```
STATUS  MODEL            COLUMNS
+       marts_payments   5
        marts_orders     12
        marts_customers  8
-       old_model        4

Summary: 1 added, 1 removed, 2 unchanged (4 total)
Relationships: 2
```

Add `--json` for machine-readable output.

## Typical Workflow

```bash
# 1. Build your dbt project
cd my-dbt-project
dbt build
dbt docs generate

# 2. Create the Legible project
legible dbt create --name "My Analytics"

# 3. Make changes to dbt models...
#    Edit models, add columns, etc.

# 4. Rebuild dbt
dbt build
dbt docs generate

# 5. Sync changes to Legible
legible dbt update --yes
```
