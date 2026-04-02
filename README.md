
<p align="center" id="top">
  <a href="https://getwren.ai/?utm_source=github&utm_medium=title&utm_campaign=readme">
    <picture>
      <source media="(prefers-color-scheme: light)" srcset="./misc/wrenai_logo.png">
      <img src="./misc/wrenai_logo_white.png" width="300px">
    </picture>
    <h1 align="center">Legible - Open-Source GenBI Agent</h1>
  </a>
</p>

> ⚡ GenBI (Generative BI) queries any database in natural language, generates accurate SQL (Text-to-SQL), charts (Text-to-Chart), and AI-powered business intelligence in seconds. ️

<p align="center">
  <img width="1920" height="1080" alt="1" src="https://github.com/kubeworkz/legible/blob/main/misc/readme1.png" />
</p>
 
## 🤖 Features

|                    | What you get | Why it matters |
|--------------------|--------------|----------------|
| **Talk to Your Data** | Ask in any language → precise SQL & answers | Slash the SQL learning curve﻿ |
| **GenBI Insights** | AI-written summaries, charts & reports | Decision-ready context in one click﻿ |
| **Semantic Layer** | MDL models encode schema, metrics, joins | Keeps LLM outputs accurate & governed﻿ |
| **Embed via API**  | Generate queries & charts inside your apps ([API Docs](https://docs.legiblequery.ai/api-reference/overview/)) | Build custom agents, SaaS features, chatbots﻿ |

## 🚀 Getting Started

Using Legible is super simple, you can set it up within 3 minutes, and start to interact with your data!

<p align="center">
  <img width="1920" height="1080" alt="2" src="https://github.com/kubeworkz/legible/blob/main/misc/readme3.png" />
</p>

## 🏗️ Architecture

<p align="center">
  <img width="1011" height="682" alt="wrenai-architecture" src="https://github.com/kubeworkz/legible/blob/main/misc/readme2.png" />
</p>


## 🔌 Data Sources

If your data source is not listed here, vote for it in our [GitHub discussion thread](https://github.com/kubeworkz/legible/discussions/3). It will be a valuable input for us to decide on the next supported data sources.
- Athena (Trino)
- Redshift
- BigQuery
- DuckDB
- Databricks
- PostgreSQL
- MySQL
- Microsoft SQL Server
- ClickHouse
- Oracle
- Trino
- Snowflake

## 🤖 LLM Models

Wren AI supports integration with various Large Language Models (LLMs), including but not limited to:
- OpenAI Models
- Azure OpenAI Models
- DeepSeek Models
- Google AI Studio – Gemini Models
- Vertex AI Models (Gemini + Anthropic)
- Bedrock Models
- Anthropic API Models
- Groq Models
- Ollama Models
- Databricks Models

Check [configuration examples here](https://github.com/kubeworkz/legible/tree/main/wren-ai-service/docs/config_examples)!

> [!CAUTION]
> The performance of Legible depends significantly on the capabilities of the LLM you choose. We strongly recommend using the most powerful model available for optimal results. Using less capable models may lead to reduced performance, slower response times, or inaccurate outputs.

## 📚 Documentation

Visit [Legible documentation](https://docs.legiblequery.ai) to view the full documentation.

## 🤖 Sandboxed AI Agents

Legible includes a full agent sandbox system powered by [NVIDIA OpenShell](https://github.com/NVIDIA/OpenShell) and [NemoClaw](https://github.com/NVIDIA/NemoClaw). Agents run in isolated containers with policy-enforced access to your semantic layer via MCP.

### OpenShell

[OpenShell](https://github.com/NVIDIA/OpenShell) is NVIDIA's open-source sandbox runtime. It provisions lightweight containers on your local machine, each with its own network policy, credential injection, and resource limits. Legible uses OpenShell to run AI coding agents (Claude Code, Codex, OpenCode, Copilot) that can query your data through the Legible MCP server.

```bash
# Create an agent sandbox
legible agent create my-analyst --type claude

# From a community sandbox image
legible agent create my-analyst --from ollama

# From a blueprint with an inference profile
legible agent create my-analyst --blueprint legible-default --profile nvidia
```

### NemoClaw

[NemoClaw](https://github.com/NVIDIA/NemoClaw) provides inference routing and network policy enforcement for agent sandboxes. It controls which endpoints an agent can reach and routes LLM inference requests through configurable provider profiles (NVIDIA, OpenAI, Anthropic, local Ollama, etc.).

### Blueprints

Blueprints are declarative YAML specs that define everything an agent needs: sandbox image, inference profiles, network policies, and resource limits. Legible ships with built-in blueprints and supports custom ones.

```yaml
# Example blueprint structure
agent:
  type: claude
components:
  sandbox:
    image: ghcr.io/nvidia/openshell/sandbox-base:latest
  inference:
    profiles:
      nvidia:
        model: meta/llama-3.3-70b-instruct
      anthropic:
        model: claude-sonnet-4-20250514
policies:
  network: policy.yaml
```

You can also use [Community Sandboxes](https://docs.legiblequery.ai/agents/community-sandboxes) — pre-built environments from the OpenShell Community catalog including base, Ollama, OpenClaw, and SDG images.

For more details, see the [Agents documentation](https://docs.legiblequery.ai/agents/) and the [CLI guide](https://docs.legiblequery.ai/guides/cli).

## 📪 Keep Posted?

[Subscribe to our blog](https://www.getwren.ai/blog/?utm_source=github&utm_medium=content&utm_campaign=readme) and [Follow our LinkedIn](www.linkedin.com/in/legiblequery)

## 🛠️ Contribution

1.	Star ⭐ the repo to show support (it really helps).
2.	Open an issue for bugs, ideas, or discussions.
3.	Read [Contribution Guidelines](https://github.com/kubeworkz/legible/blob/main/CONTRIBUTING.md) for setup & PR guidelines.

## ⭐️ Community

- Join everyone in our [Discord](https://discord.gg/twQwNmsAG8) for real-time help and previews.
- If there are any issues, please visit [GitHub Issues](https://github.com/kubeworkz/legible/issues).
- Explore our [public roadmap](https://legible.notion.site/) to stay updated on upcoming features and improvements!

Please note that our [Code of Conduct](./CODE_OF_CONDUCT.md) applies to all Legible community channels. Users are **highly encouraged** to read and adhere to them to avoid repercussions.

<p align="right">
  <a href="#top">⬆️ Back to Top</a>
</p>
