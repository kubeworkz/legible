---
sidebar_position: 6
title: Knowledge Base
---

# Knowledge Base Endpoints

Manage the knowledge base that improves SQL generation accuracy. There are two types of knowledge:

- **Instructions** — Natural language rules that guide the AI (e.g. "revenue means total_amount minus refunds")
- **SQL Pairs** — Example question→SQL pairs that the AI learns from

---

## Instructions

### List Instructions

```
GET /api/v1/knowledge/instructions
```

#### Example Request

```bash
curl https://your-host/api/v1/knowledge/instructions \
  -H "Authorization: Bearer osk-your-api-key"
```

#### Response (200)

```json
[
  {
    "id": 1,
    "instruction": "When calculating revenue, always use total_amount minus refund_amount.",
    "questions": [],
    "isGlobal": true
  },
  {
    "id": 2,
    "instruction": "Active customers are those with orders in the last 90 days.",
    "questions": ["How many active customers do we have?", "Show active customer count"],
    "isGlobal": false
  }
]
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Instruction ID |
| `instruction` | string | The instruction text |
| `questions` | array | Questions this instruction applies to (empty for global) |
| `isGlobal` | boolean | If `true`, applies to all queries. If `false`, only matches listed questions. |

### Create Instruction

```
POST /api/v1/knowledge/instructions
```

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `instruction` | string | **Yes** | Instruction text (max 1000 characters) |
| `questions` | array | No | Questions this instruction should apply to |
| `isGlobal` | boolean | No | Apply to all queries. Default: `false` |

#### Example — Global Instruction

```bash
curl -X POST https://your-host/api/v1/knowledge/instructions \
  -H "Authorization: Bearer osk-your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "instruction": "Revenue is defined as total_amount minus refund_amount from the orders table.",
    "isGlobal": true
  }'
```

#### Example — Question-Specific Instruction

```bash
curl -X POST https://your-host/api/v1/knowledge/instructions \
  -H "Authorization: Bearer osk-your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "instruction": "Active customers are those with at least one order in the last 90 days.",
    "questions": [
      "How many active customers?",
      "Show me active customer count",
      "What percentage of customers are active?"
    ]
  }'
```

#### Response (201)

```json
{
  "id": 3,
  "instruction": "Revenue is defined as total_amount minus refund_amount from the orders table.",
  "questions": [],
  "isGlobal": true
}
```

### Update Instruction

```
PUT /api/v1/knowledge/instructions/:id
```

#### Request Body

All fields are optional — only include fields you want to update.

| Field | Type | Description |
|-------|------|-------------|
| `instruction` | string | Updated instruction text (max 1000 characters) |
| `questions` | array | Updated list of matching questions |
| `isGlobal` | boolean | Updated scope |

#### Example

```bash
curl -X PUT https://your-host/api/v1/knowledge/instructions/3 \
  -H "Authorization: Bearer osk-your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "instruction": "Net revenue = total_amount - refund_amount - discount_amount"
  }'
```

#### Response (200)

Returns the updated instruction object.

### Delete Instruction

```
DELETE /api/v1/knowledge/instructions/:id
```

#### Example

```bash
curl -X DELETE https://your-host/api/v1/knowledge/instructions/3 \
  -H "Authorization: Bearer osk-your-api-key"
```

#### Response (204)

No content.

---

## SQL Pairs

SQL pairs are example question→SQL mappings that teach the AI how to translate specific types of questions.

### List SQL Pairs

```
GET /api/v1/knowledge/sql_pairs
```

#### Example Request

```bash
curl https://your-host/api/v1/knowledge/sql_pairs \
  -H "Authorization: Bearer osk-your-api-key"
```

#### Response (200)

```json
[
  {
    "id": 1,
    "question": "What is the total revenue this month?",
    "sql": "SELECT SUM(total_amount - refund_amount) AS revenue FROM orders WHERE order_date >= DATE_TRUNC('month', CURRENT_DATE)",
    "createdAt": "2026-01-15T10:30:00Z",
    "updatedAt": "2026-01-15T10:30:00Z"
  }
]
```

### Create SQL Pair

```
POST /api/v1/knowledge/sql_pairs
```

The SQL is validated against your deployed model before saving.

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `question` | string | **Yes** | Example question (max 1000 characters) |
| `sql` | string | **Yes** | Corresponding SQL query (max 10000 characters) |

#### Example

```bash
curl -X POST https://your-host/api/v1/knowledge/sql_pairs \
  -H "Authorization: Bearer osk-your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is the total revenue this month?",
    "sql": "SELECT SUM(total_amount - refund_amount) AS revenue FROM orders WHERE order_date >= DATE_TRUNC('\''month'\'', CURRENT_DATE)"
  }'
```

#### Response (201)

```json
{
  "id": 2,
  "question": "What is the total revenue this month?",
  "sql": "SELECT SUM(total_amount - refund_amount) AS revenue FROM orders WHERE order_date >= DATE_TRUNC('month', CURRENT_DATE)",
  "createdAt": "2026-03-17T14:00:00Z",
  "updatedAt": "2026-03-17T14:00:00Z"
}
```

:::note
The SQL is validated before saving. If the SQL is invalid against your current model, the request will return a `400` error.
:::

### Update SQL Pair

```
PUT /api/v1/knowledge/sql_pairs/:id
```

#### Request Body

| Field | Type | Description |
|-------|------|-------------|
| `question` | string | Updated question (max 1000 characters) |
| `sql` | string | Updated SQL (max 10000 characters, re-validated) |

#### Example

```bash
curl -X PUT https://your-host/api/v1/knowledge/sql_pairs/2 \
  -H "Authorization: Bearer osk-your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "SELECT SUM(total_amount - refund_amount - discount_amount) AS net_revenue FROM orders WHERE order_date >= DATE_TRUNC('\''month'\'', CURRENT_DATE)"
  }'
```

#### Response (200)

Returns the updated SQL pair object.

### Delete SQL Pair

```
DELETE /api/v1/knowledge/sql_pairs/:id
```

#### Example

```bash
curl -X DELETE https://your-host/api/v1/knowledge/sql_pairs/2 \
  -H "Authorization: Bearer osk-your-api-key"
```

#### Response (204)

No content.
