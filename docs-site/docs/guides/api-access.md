---
sidebar_position: 8
title: API Access
---

# API Access

Legible provides a REST API for programmatic access to query generation and execution. You can manage API keys, view request history, and monitor usage from the **API Management** section.

## API Keys

Generate API keys to authenticate programmatic requests:

1. Go to **Settings → API Keys**
2. Click **Generate New Key**
3. Copy the key — it won't be shown again
4. Use it in the `Authorization: Bearer <key>` header

## API History

The **API History** page shows a log of all API calls, including:

- Request timestamp
- API type (query, validation, etc.)
- Input question or SQL
- Response status and execution time
- Generated SQL

Use the filters to narrow results by API type or date range. You can also export the history for analysis.

## API Reference

### Query Endpoint

```
POST /api/v1/query
```

Generate and execute SQL from a natural language question.

**Headers:**
```
Authorization: Bearer <api-key>
Content-Type: application/json
```

**Request body:**
```json
{
  "question": "What are the top 10 customers by revenue?"
}
```

**Response:**
```json
{
  "sql": "SELECT ...",
  "data": [...],
  "columns": [...]
}
```

### Query Usage

Monitor API usage from the **Query Usage** dashboard, which shows:

- Total queries this month
- Queries by source (UI, API, MCP)
- Daily usage trends
- Cost breakdown (if billing is enabled)
