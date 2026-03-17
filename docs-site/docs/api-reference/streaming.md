---
sidebar_position: 5
title: Streaming
---

# Streaming Endpoints

These endpoints use **Server-Sent Events (SSE)** to stream results incrementally. They're ideal for real-time UIs where you want to show progress as the AI generates responses.

## Connection Protocol

Streaming endpoints return `text/event-stream` responses. Each event is a JSON-encoded `data:` line:

```
data: {"state":"UNDERSTANDING","message":"Analyzing your question..."}

data: {"state":"GENERATING","message":"Building SQL query..."}

data: {"state":"FINISHED","sql":"SELECT ...","threadId":"abc-123"}

```

### Event States

Most streaming endpoints emit events with a `state` field indicating progress:

| State | Description |
|-------|-------------|
| `UNDERSTANDING` | Analyzing the natural language question |
| `SEARCHING` | Searching the semantic model |
| `GENERATING` | Generating SQL or summary |
| `FINISHED` | Complete — final payload included |
| `FAILED` | Error occurred — `error` field included |

---

## Stream Generate SQL

Stream SQL generation with progress updates.

```
POST /api/v1/stream/generate_sql
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `question` | string | **Yes** | Natural language question |
| `language` | string | No | Language for AI responses |
| `threadId` | string | No | Thread ID for conversation context |

### Example Request

```bash
curl -N -X POST https://your-host/api/v1/stream/generate_sql \
  -H "Authorization: Bearer osk-your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What are the top 10 products by sales?"
  }'
```

### Event Stream

```
data: {"state":"UNDERSTANDING"}

data: {"state":"SEARCHING"}

data: {"state":"GENERATING"}

data: {"state":"FINISHED","sql":"SELECT p.name, SUM(s.amount) AS total_sales FROM products p JOIN sales s ON p.id = s.product_id GROUP BY p.name ORDER BY total_sales DESC LIMIT 10","threadId":"9c537507-9cec-46ed-b877-07bfa6322bed"}

```

The final `FINISHED` event contains the same fields as the non-streaming [`/generate_sql`](sql-endpoints#generate-sql) response.

---

## Stream Ask

Stream the full ask pipeline — SQL generation, execution, and summary — with progress updates.

```
POST /api/v1/stream/ask
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `question` | string | **Yes** | Natural language question |
| `sampleSize` | integer | No | Max rows for analysis |
| `language` | string | No | Language for AI responses |
| `threadId` | string | No | Thread ID for conversation context |

### Example Request

```bash
curl -N -X POST https://your-host/api/v1/stream/ask \
  -H "Authorization: Bearer osk-your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "How did revenue change month over month?"
  }'
```

### Event Stream

```
data: {"state":"UNDERSTANDING"}

data: {"state":"SEARCHING"}

data: {"state":"GENERATING"}

data: {"state":"EXECUTING"}

data: {"state":"SUMMARIZING"}

data: {"state":"FINISHED","sql":"SELECT ...","summary":"Revenue grew 12% in January...","threadId":"abc-123"}

```

---

## Stream Explanation

Stream a detailed explanation for non-SQL questions. Use the `explanationQueryId` returned by a `NON_SQL_QUERY` error from [`/generate_sql`](sql-endpoints#generate-sql).

```
GET /api/v1/stream_explanation?queryId=<explanationQueryId>
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `queryId` | string | **Yes** | The `explanationQueryId` from a prior `NON_SQL_QUERY` error |

### Example Request

```bash
curl -N "https://your-host/api/v1/stream_explanation?queryId=71b016c5-42bb-4897-82d6-46f9b0bf7d94" \
  -H "Authorization: Bearer osk-your-api-key"
```

### Event Stream

```
data: {"message":"Legible can help you "}

data: {"message":"analyze your data using "}

data: {"message":"natural language queries. "}

data: {"message":"Try asking about specific "}

data: {"message":"metrics, trends, or comparisons."}

data: {"done":true}

```

Each event contains a `message` fragment. Concatenate all fragments for the full explanation. The final event has `"done": true`.

---

## Client Examples

### JavaScript (EventSource)

```javascript
const response = await fetch('/api/v1/stream/ask', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer osk-your-api-key',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ question: 'Total revenue by month?' }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const text = decoder.decode(value);
  for (const line of text.split('\n')) {
    if (line.startsWith('data: ')) {
      const event = JSON.parse(line.slice(6));
      console.log(event.state, event.message || event.sql || '');
    }
  }
}
```

### Python

```python
import requests
import json

response = requests.post(
    'https://your-host/api/v1/stream/ask',
    headers={
        'Authorization': 'Bearer osk-your-api-key',
        'Content-Type': 'application/json',
    },
    json={'question': 'Total revenue by month?'},
    stream=True,
)

for line in response.iter_lines():
    if line and line.startswith(b'data: '):
        event = json.loads(line[6:])
        print(event.get('state', ''), event.get('sql', ''))
```
