---
sidebar_position: 3
title: AI Analysis
---

# AI Analysis Endpoints

These endpoints combine SQL generation with AI-powered analysis — summaries, full question-answering, and chart generation.

## Ask

A combined endpoint that generates SQL from a question, executes it, and returns a natural language summary. This is the all-in-one endpoint for question answering.

```
POST /api/v1/ask
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `question` | string | **Yes** | Natural language question |
| `sampleSize` | integer | No | Max rows for the analysis. Default: `1000` |
| `language` | string | No | Language for AI responses (e.g. `en`, `zh-TW`) |
| `threadId` | string | No | Thread ID for conversation context |

### Example Request

```bash
curl -X POST https://your-host/api/v1/ask \
  -H "Authorization: Bearer osk-your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Which product categories had the highest growth last quarter?",
    "sampleSize": 500
  }'
```

### Success Response (200) — SQL Result

When the question can be answered with SQL:

```json
{
  "id": "a2c4e6f8-1234-5678-9abc-def012345678",
  "sql": "SELECT category, SUM(revenue) AS total FROM products GROUP BY category ORDER BY total DESC",
  "summary": "Electronics had the highest growth at 23%, followed by Home & Garden at 18% and Sports at 12%.",
  "threadId": "9c537507-9cec-46ed-b877-07bfa6322bed"
}
```

### Success Response (200) — Non-SQL Result

When the question is conversational (not answerable with SQL):

```json
{
  "id": "b3d5f7a9-2345-6789-abcd-ef0123456789",
  "type": "EXPLANATION",
  "explanation": "I can help you analyze data from your connected database. Try asking about specific metrics, trends, or comparisons.",
  "threadId": "9c537507-9cec-46ed-b877-07bfa6322bed"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique response identifier |
| `sql` | string | Generated SQL (when applicable) |
| `summary` | string | AI-generated summary of results |
| `type` | string | Response type (`EXPLANATION` for non-SQL) |
| `explanation` | string | Explanation text (for non-SQL questions) |
| `threadId` | string | Thread ID (existing or newly created) |

---

## Generate Summary

Generate a natural language summary from a SQL query and its results.

```
POST /api/v1/generate_summary
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `question` | string | **Yes** | The original question |
| `sql` | string | **Yes** | SQL query that answers the question |
| `sampleSize` | integer | No | Max rows to include in summary. Default: `1000` |
| `language` | string | No | Language for the summary |
| `threadId` | string | No | Thread ID for conversation context |

### Example Request

```bash
curl -X POST https://your-host/api/v1/generate_summary \
  -H "Authorization: Bearer osk-your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is the average order value by region?",
    "sql": "SELECT region, AVG(total) AS avg_order FROM orders GROUP BY region",
    "sampleSize": 500
  }'
```

### Success Response (200)

```json
{
  "summary": "The West region has the highest average order value at $142.50, followed by East at $128.30, South at $115.80, and North at $98.20.",
  "threadId": "503a8ca5-8171-43b5-b45b-86de2849467b"
}
```

---

## Generate Vega Chart

Generate a [Vega-Lite](https://vega.github.io/vega-lite/) chart specification from a question and SQL query. The response includes embedded data suitable for direct rendering.

```
POST /api/v1/generate_vega_chart
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `question` | string | **Yes** | The question driving the visualization |
| `sql` | string | **Yes** | SQL query that produces the chart data |
| `sampleSize` | integer | No | Max rows to include. Default: `10000` |
| `threadId` | string | No | Thread ID for conversation context |

### Example Request

```bash
curl -X POST https://your-host/api/v1/generate_vega_chart \
  -H "Authorization: Bearer osk-your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Show total payments by state",
    "sql": "SELECT customer_state, SUM(payment_value) AS total FROM payments GROUP BY customer_state ORDER BY total DESC LIMIT 10"
  }'
```

### Success Response (200)

```json
{
  "threadId": "75ab23c8-9124-4560-a125-fbe7e321dcba",
  "vegaSpec": {
    "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
    "title": "Total Payments by Customer State",
    "data": {
      "values": [
        { "customer_state": "SP", "total": 5218263.12 },
        { "customer_state": "RJ", "total": 1886761.45 }
      ]
    },
    "mark": { "type": "bar" },
    "width": "container",
    "height": "container",
    "encoding": {
      "x": { "field": "customer_state", "type": "nominal", "title": "State" },
      "y": { "field": "total", "type": "quantitative", "title": "Total Payments" }
    }
  }
}
```

The `vegaSpec` can be rendered directly with any Vega-Lite compatible library (e.g. [vega-embed](https://github.com/vega/vega-embed)).

### Chart Configuration

The generated spec includes sensible defaults:

- Tooltips enabled on mark hover
- Font: Roboto/Arial/Noto Sans
- Axis labels at 10px, titles in dark gray
- X-axis labels angled at -45° for readability
- Default bar color: `#1570EF`
