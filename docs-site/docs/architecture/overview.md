---
sidebar_position: 1
title: Overview
---

# Architecture Overview

Legible consists of several services that work together to provide AI-powered business intelligence.

## Service Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User / AI Agent                       │
└──────────┬──────────────────────────────┬───────────────────┘
           │ :3000                        │ :9000
  ┌────────▼────────┐          ┌──────────▼──────────┐
  │    Wren UI       │          │    MCP Server        │
  │  (Next.js)       │          │  (Streamable HTTP)   │
  └───┬────┬────┬───┘          └──────────┬──────────┘
      │    │    │                          │
      │    │    └──────────────────────────┤
      │    │                               │
  ┌───▼──┐ ┌──▼─────────────┐   ┌────────▼─────────┐
  │Wren  │ │ AI Service      │   │ Ibis Server       │
  │Engine│ │ (FastAPI)        │   │ (FastAPI + Rust)   │
  │(Java)│ └──┬──────┬──────┘   └────────┬─────────┘
  └──────┘    │      │                    │
        ┌─────▼──┐ ┌─▼───────────┐       │
        │ Qdrant │ │ Embeddings   │       │
        │(Vector)│ │ (Infinity)   │  ┌────▼────────┐
        └────────┘ └──────────────┘  │ Data Sources │
                                     │ (PG, BQ, …)  │
                                     └──────────────┘
```

## Services

### Wren UI (port 3000)
The primary user interface, built with **Next.js**. Provides:
- Project management and data source configuration
- Natural language question input
- SQL results and chart visualization
- Semantic model (MDL) management
- User/org administration, billing, API key management

### Wren AI Service (port 5555)
A **FastAPI** Python service that handles the AI pipeline:
- Text-to-SQL generation using LLMs (Gemini, OpenAI, Anthropic, Ollama)
- Semantic search via vector embeddings
- MDL indexing into the vector store
- SQL breakdown and explanation

### Ibis Server (port 8000, MCP on 9000)
A **FastAPI** Python + **Rust** service that:
- Translates SQL through the semantic layer (MDL)
- Executes queries against 22+ data sources via the Ibis framework
- Hosts the MCP server for AI agent integration
- Powered by Apache DataFusion (Rust) for query planning

### Wren Engine (port 8080)
A legacy **Java** SQL engine used as a fallback when the Rust-based engine (v3) cannot handle a query.

### Qdrant
A **vector database** storing embeddings of the semantic model for retrieval-augmented generation (RAG).

### Text Embeddings Inference
An embedding model server (**BAAI/bge-base-en-v1.5**) that converts text into vector embeddings for semantic search.

## Query Flow

When a user asks a natural language question:

1. **Wren UI** sends the question to the **AI Service**
2. **AI Service** retrieves relevant semantic model context from **Qdrant**
3. The LLM generates a SQL query using the semantic context
4. The SQL is sent to **Ibis Server** for translation through the MDL
5. **Ibis Server** uses DataFusion (Rust) to plan the query + the MDL to resolve models, relationships, and calculated fields
6. The translated SQL is executed against the **data source** (PostgreSQL, BigQuery, etc.)
7. Results flow back through the chain to the UI

## Networking

All services communicate over a Docker bridge network (`wren`). Only selected ports are exposed to the host:

| Port | Service | Purpose |
|------|---------|---------|
| 3000 | Wren UI | Main user interface |
| 5555 | AI Service | AI pipeline API |
| 9000 | MCP Server | AI agent integration |
| 9001 | MCP Web UI | MCP configuration interface |
