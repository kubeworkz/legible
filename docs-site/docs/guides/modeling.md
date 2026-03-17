---
sidebar_position: 4
title: Data Modeling
---

# Data Modeling

Data modeling in Legible adds a semantic layer over your raw database schema. This layer organizes relationships, semantics, and calculations so the AI engine can align with your business logic, retrieve precise data, and generate meaningful insights.

## Overview

When you connect a data source, Legible creates **data models** based on your selected tables. These models define:

- **Columns** — the fields available for querying
- **Relationships** — how models relate to each other (e.g., orders → customers)
- **Calculated fields** — derived columns using expressions
- **Primary keys** — unique identifiers for each model

## Models

A model represents a single table or view from your data source. Each model contains columns that map to the underlying database columns, plus any calculated fields you define.

### Creating Models

1. Navigate to the **Modeling** section in the sidebar
2. Click **Add Model** or select tables during initial setup
3. Choose which columns to include
4. Set the primary key

### Editing Models

- Click on any model in the modeling sidebar to view its details
- Add or remove columns as needed
- Add calculated fields for derived values

## Views

Views are saved queries that act as virtual models. They let you create reusable data transformations without modifying the underlying data source.

### Creating Views

1. Ask a question in the Home section
2. When you get a SQL result, click **Save as View**
3. Name the view and it becomes available as a model for future queries

Views are especially useful for:
- Pre-aggregated metrics
- Complex joins that are frequently reused
- Business-specific transformations

## Relationships

Relationships define how models connect to each other. They help the AI engine understand joins and generate correct multi-table queries.

### Types of Relationships

| Type | Description | Example |
|------|-------------|---------|
| **One-to-one** | Each row in Model A maps to exactly one row in Model B | `user` ↔ `user_profile` |
| **One-to-many** | Each row in Model A maps to multiple rows in Model B | `customer` → `orders` |
| **Many-to-one** | Multiple rows in Model A map to one row in Model B | `orders` → `customer` |

### Defining Relationships

1. Go to the **Modeling** section
2. Select a model
3. Click **Add Relationship**
4. Choose the related model and the join columns
5. Select the relationship type

## Primary Key

Each model should have a primary key defined. The primary key helps the AI engine understand how to uniquely identify rows and correctly generate aggregate queries.

### Setting a Primary Key

1. Open the model in the Modeling section
2. Click the key icon next to the column you want to set as the primary key
3. Alternatively, during calculated field creation, you'll be prompted to set a primary key if one isn't defined

:::tip
If your table doesn't have a natural primary key, consider using a unique identifier column or a combination of columns.
:::

## Calculated Fields

Calculated fields let you define derived columns using SQL expressions. These are computed at query time and can reference other columns in the same model.

### Examples

- **Full name**: `CONCAT(first_name, ' ', last_name)`
- **Total amount**: `quantity * unit_price`
- **Is active**: `CASE WHEN status = 'active' THEN true ELSE false END`
