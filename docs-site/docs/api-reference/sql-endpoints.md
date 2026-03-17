---
sidebar_position: 2
title: SQL Endpoints
---

# SQL Endpoints

These endpoints handle SQL generation from natural language and direct SQL execution.

## Generate SQL

Convert a natural language question into a SQL query using the deployed semantic model.

```
POST /api/v1/generate_sql
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `question` | string | **Yes** | Natural language question |
| `threadId` | string | No | Thread ID for conversation context |
| `language` | string | No | Language for AI responses (e.g. `en`, `zh-TW`). Defaults to project setting. |
| `returnSqlDialect` | boolean | No | If `true`, returns SQL in the native database dialect. Default: `false` |

### Example Request

```bash
curl -X POST https://your-host/api/v1/generate_sql \
  -H "Authorization: Bearer osk-your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What are the top 10 customers by total revenue?",
    "threadId": "9c537507-9cec-46ed-b877-07bfa6322bed"
  }'
```

### Success Response (200)

```json
{
  "id": "1fbc0d64-1c58-45b2-a990-9183bbbcf913",
  "sql": "SELECT c.customer_name, SUM(o.total_amount) AS revenue FROM customers c JOIN orders o ON c.id = o.customer_id GROUP BY c.customer_name ORDER BY revenue DESC LIMIT 10",
  "threadId": "9c537507-9cec-46ed-b877-07bfa6322bed"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique response identifier |
| `sql` | string | Generated SQL query |
| `threadId` | string | Thread ID (existing or newly created) |

### Error Response (400)

When the question cannot be answered with SQL:

```json
{
  "id": "75c13d09-6f86-4e79-a00e-a4f85f73f2d7",
  "code": "NON_SQL_QUERY",
  "error": "User asks about features and capabilities, unrelated to database schema.",
  "explanationQueryId": "71b016c5-42bb-4897-82d6-46f9b0bf7d94"
}
```

The `explanationQueryId` can be used with the [stream explanation endpoint](streaming#stream-explanation) to get a detailed response for non-SQL questions.

### Timeout

This endpoint polls the AI service internally with a **180-second timeout**. If generation exceeds this limit, a timeout error is returned.

---

## Run SQL

Execute a SQL query against your connected data source and return structured results.

```
POST /api/v1/run_sql
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sql` | string | **Yes** | SQL query to execute |
| `threadId` | string | No | Thread ID for conversation context |
| `limit` | integer | No | Maximum rows to return. Default: `1000` |

### Example Request

```bash
curl -X POST https://your-host/api/v1/run_sql \
  -H "Authorization: Bearer osk-your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "SELECT customer_name, total_revenue FROM customers ORDER BY total_revenue DESC LIMIT 5",
    "limit": 100
  }'
```

### Success Response (200)

```json
{
  "id": "09d46224-0068-4ca3-bce4-f1fc85093eb6",
  "records": [
    {
      "customer_name": "Acme Corp",
      "total_revenue": 152340.50
    },
    {
      "customer_name": "Global Industries",
      "total_revenue": 98200.00
    }
  ],
  "columns": [
    {
      "name": "customer_name",
      "type": "VARCHAR"
    },
    {
      "name": "total_revenue",
      "type": "DECIMAL"
    }
  ],
  "threadId": "503a8ca5-8171-43b5-b45b-86de2849467b",
  "totalRows": 2
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique response identifier |
| `records` | array | Array of row objects |
| `columns` | array | Column metadata (name, type, notNull, properties) |
| `threadId` | string | Thread ID (existing or newly created) |
| `totalRows` | integer | Total rows returned |

### Column Metadata

Each entry in the `columns` array:

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Column name |
| `type` | string | Data type (e.g. `VARCHAR`, `INTEGER`, `DECIMAL`, `TIMESTAMP`) |
| `notNull` | boolean | Whether the column disallows nulls |
| `properties` | object | Additional column properties |
