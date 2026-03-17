---
sidebar_position: 4
title: Models & Schema
---

# Models & Schema Endpoints

These endpoints provide access to the deployed semantic model, including model definitions, relationships, and AI-assisted schema enrichment.

## Get Models

Retrieve the currently deployed semantic model, including all models, columns, relationships, and views.

```
GET /api/v1/models
```

### Example Request

```bash
curl https://your-host/api/v1/models \
  -H "Authorization: Bearer osk-your-api-key"
```

### Success Response (200)

```json
{
  "hash": "abc123def456",
  "models": [
    {
      "name": "customers",
      "columns": [
        { "name": "id", "type": "INTEGER", "notNull": true },
        { "name": "customer_name", "type": "VARCHAR" },
        { "name": "email", "type": "VARCHAR" },
        { "name": "region", "type": "VARCHAR" }
      ],
      "properties": {
        "description": "Customer master table"
      }
    },
    {
      "name": "orders",
      "columns": [
        { "name": "id", "type": "INTEGER", "notNull": true },
        { "name": "customer_id", "type": "INTEGER" },
        { "name": "total_amount", "type": "DECIMAL" },
        { "name": "order_date", "type": "TIMESTAMP" }
      ]
    }
  ],
  "relationships": [
    {
      "name": "orders_customer",
      "models": ["orders", "customers"],
      "joinType": "MANY_TO_ONE",
      "condition": "orders.customer_id = customers.id"
    }
  ],
  "views": []
}
```

| Field | Type | Description |
|-------|------|-------------|
| `hash` | string | Hash of the current deployment |
| `models` | array | Deployed model definitions with columns |
| `relationships` | array | Relationships between models |
| `views` | array | Defined views |

:::note
This endpoint requires an active deployment. If no models have been deployed, a `400` error is returned.
:::

---

## Semantics Descriptions

Generate AI-powered descriptions for models and their columns. This is an asynchronous operation — submit a request, then poll for results.

### Start Generation

```
POST /api/v1/semantics-descriptions
```

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `selectedModels` | array | **Yes** | Model names to generate descriptions for |
| `userPrompt` | string | No | Additional context to guide description generation |

#### Example Request

```bash
curl -X POST https://your-host/api/v1/semantics-descriptions \
  -H "Authorization: Bearer osk-your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "selectedModels": ["customers", "orders"],
    "userPrompt": "This is an e-commerce platform database"
  }'
```

#### Response (200)

```json
{
  "id": "d4e5f6a7-8901-2345-6789-abcdef012345"
}
```

### Poll for Results

```
GET /api/v1/semantics-descriptions?id=<id>
```

#### Example

```bash
curl "https://your-host/api/v1/semantics-descriptions?id=d4e5f6a7-8901-2345-6789-abcdef012345" \
  -H "Authorization: Bearer osk-your-api-key"
```

#### Response — In Progress

```json
{
  "id": "d4e5f6a7-8901-2345-6789-abcdef012345",
  "status": "generating"
}
```

#### Response — Complete

```json
{
  "id": "d4e5f6a7-8901-2345-6789-abcdef012345",
  "status": "finished",
  "response": {
    "customers": {
      "description": "Contains customer profile information including contact details and geographic data.",
      "columns": {
        "id": "Unique customer identifier",
        "customer_name": "Full name of the customer",
        "email": "Customer email address",
        "region": "Geographic region where the customer is located"
      }
    },
    "orders": {
      "description": "Transaction records for customer orders.",
      "columns": {
        "id": "Unique order identifier",
        "customer_id": "References the customer who placed the order",
        "total_amount": "Total monetary value of the order",
        "order_date": "Date and time the order was placed"
      }
    }
  }
}
```

| Status | Description |
|--------|-------------|
| `generating` | Descriptions are being generated |
| `finished` | Generation complete — results in `response` |
| `failed` | Generation failed — details in `error` |

---

## Relationship Recommendations

Get AI-generated recommendations for relationships between your models. This is an asynchronous operation.

### Start Recommendation

```
POST /api/v1/relationship-recommendations
```

No request body is needed — the current deployed MDL is used automatically.

#### Example Request

```bash
curl -X POST https://your-host/api/v1/relationship-recommendations \
  -H "Authorization: Bearer osk-your-api-key"
```

#### Response (200)

```json
{
  "id": "e5f6a7b8-9012-3456-789a-bcdef0123456"
}
```

### Poll for Results

```
GET /api/v1/relationship-recommendations?id=<id>
```

#### Response — Complete

```json
{
  "id": "e5f6a7b8-9012-3456-789a-bcdef0123456",
  "status": "finished",
  "response": [
    {
      "name": "orders_customers",
      "models": ["orders", "customers"],
      "joinType": "MANY_TO_ONE",
      "condition": "orders.customer_id = customers.id",
      "reason": "The customer_id column in orders references the id column in customers, indicating a many-to-one relationship."
    }
  ]
}
```
