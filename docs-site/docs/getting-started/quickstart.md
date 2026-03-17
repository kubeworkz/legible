---
sidebar_position: 1
title: Quickstart
---

# Quickstart

Get Legible running locally in under 5 minutes.

## Prerequisites

- **Docker** with Docker Compose v2
- At least **8 GB RAM** available for containers
- An **LLM API key** (Gemini, OpenAI, Anthropic, or Ollama for local models)

## 1. Clone the Repository

```bash
git clone https://github.com/kubeworkz/legible.git
cd legible
```

## 2. Configure Environment

```bash
cp docker/.env.example docker/.env
cp docker/config.example.yaml docker/config.yaml
```

Edit `docker/.env` and set your LLM API key:

```bash
# For Google Gemini
GEMINI_API_KEY=your-gemini-api-key

# Or for OpenAI
OPENAI_API_KEY=your-openai-api-key
```

## 3. Build & Start

```bash
./start.sh
```

This builds all Docker images and starts the stack. On first run, this takes a few minutes.

## 4. Open the UI

Once all services are healthy, open:

- **Legible UI**: [http://localhost:3000](http://localhost:3000)
- **AI Service**: [http://localhost:5555](http://localhost:5555)

## 5. Connect Your Data

1. Open the UI and create a new project
2. Choose your data source (PostgreSQL, DuckDB, BigQuery, etc.)
3. Enter connection credentials
4. Legible will discover your tables and columns

## 6. Ask a Question

Navigate to the Home thread and type a natural language question like:

> What are the top 10 customers by total order amount?

Legible will generate SQL, execute it against your data source, and display the results.

## Next Steps

- [Architecture Overview](/architecture/overview) — Understand how the components work
- [Configuration Guide](/guides/configuration) — Customize LLMs and settings
- [MCP Integration](/guides/mcp-integration) — Connect AI agents to your data

## Sample Datasets

Legible ships with several sample datasets for testing and evaluation:

| Dataset | Description |
|---------|-------------|
| **E-commerce** | Orders, customers, products, and transactions |
| **Human Resource** | Employees, departments, salaries, and positions |
| **Card Transaction** | Credit card transactions with merchants and categories |
| **Hotel Rating** | International hotel booking analytics |
| **Supply Chain** | Supply chain operations and logistics |

During project setup, choose **"Use sample dataset"** to load one of these datasets into a built-in DuckDB instance — no external database required.
