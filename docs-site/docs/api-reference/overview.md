---
sidebar_position: 1
title: Overview
---

# API Reference

Legible exposes a REST API for programmatic access to SQL generation, query execution, AI-driven analysis, and knowledge management. All endpoints are served from your Legible instance at port **3000**.

## Base URL

```
https://<your-legible-host>/api/v1
```

## Authentication

All API requests require an API key passed in the `Authorization` header:

```
Authorization: Bearer <api-key>
```

### Key Types

| Key Prefix | Type | Scope |
|------------|------|-------|
| `osk-...` | Organization Key | Full access to all projects |
| `psk-...` | Project Key | Scoped to a single project |

Generate API keys from **Settings → API Keys** in the Legible UI.

### Project Scoping

When using an organization key, include the `X-Project-Id` header to target a specific project. Project keys automatically scope to their assigned project.

## Rate Limiting

All endpoints enforce per-key rate limits. Response headers indicate your current status:

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests per window |
| `X-RateLimit-Remaining` | Remaining requests in window |
| `X-RateLimit-Reset` | Unix timestamp when the window resets |

## Response Format

### Success

Successful responses return JSON with endpoint-specific fields:

```json
{
  "id": "1fbc0d64-1c58-45b2-a990-9183bbbcf913",
  "sql": "SELECT * FROM customers",
  "threadId": "9c537507-9cec-46ed-b877-07bfa6322bed"
}
```

### Error

Error responses include a code and message:

```json
{
  "id": "75c13d09-6f86-4e79-a00e-a4f85f73f2d7",
  "code": "NON_SQL_QUERY",
  "error": "Unable to generate SQL for this question."
}
```

Common error codes:

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `NON_SQL_QUERY` | 400 | Question cannot be answered with SQL |
| `DEPLOYMENT_REQUIRED` | 400 | No active model deployment |
| `UNAUTHORIZED` | 401 | Invalid or missing API key |
| `RATE_LIMITED` | 429 | Rate limit exceeded |

## Conversation Threads

Most endpoints accept and return a `threadId` parameter. Threads maintain conversation context across related requests — pass the `threadId` from a previous response to keep context in follow-up queries.

## Endpoints Overview

| Endpoint | Method | Description |
|----------|--------|-------------|
| [`/generate_sql`](sql-endpoints#generate-sql) | POST | Convert natural language to SQL |
| [`/run_sql`](sql-endpoints#run-sql) | POST | Execute SQL and return results |
| [`/ask`](ai-analysis#ask) | POST | Generate SQL + summary in one call |
| [`/generate_summary`](ai-analysis#generate-summary) | POST | Summarize query results |
| [`/generate_vega_chart`](ai-analysis#generate-vega-chart) | POST | Generate a Vega chart spec |
| [`/models`](models-schema) | GET | Get deployed models and schema |
| [`/semantics-descriptions`](models-schema#semantics-descriptions) | POST/GET | Generate model descriptions |
| [`/relationship-recommendations`](models-schema#relationship-recommendations) | POST/GET | Recommend model relationships |
| [`/stream/generate_sql`](streaming#stream-generate-sql) | POST | Stream SQL generation (SSE) |
| [`/stream/ask`](streaming#stream-ask) | POST | Stream ask results (SSE) |
| [`/stream_explanation`](streaming#stream-explanation) | GET | Stream non-SQL explanations (SSE) |
| [`/knowledge/instructions`](knowledge-base#instructions) | GET/POST | Manage instructions |
| [`/knowledge/instructions/:id`](knowledge-base#update-instruction) | PUT/DELETE | Update or delete an instruction |
| [`/knowledge/sql_pairs`](knowledge-base#sql-pairs) | GET/POST | Manage SQL pairs |
| [`/knowledge/sql_pairs/:id`](knowledge-base#update-sql-pair) | PUT/DELETE | Update or delete a SQL pair |
