---
sidebar_position: 5
title: Community Sandboxes
---

# Community Sandboxes

Use pre-built sandboxes from the [OpenShell Community](https://github.com/NVIDIA/OpenShell-Community) catalog, or contribute your own.

## What Are Community Sandboxes?

Community sandboxes are ready-to-use environments published in the [OpenShell Community](https://github.com/NVIDIA/OpenShell-Community) repository. Each sandbox bundles a Dockerfile, network policy, optional skills, and startup scripts into a single package that you can launch with one command.

When you create a Legible agent, you can choose a community sandbox as the base environment instead of using a built-in [blueprint](/agents/blueprints) or custom Dockerfile.

## Current Catalog

The following community sandboxes are available from the NVIDIA OpenShell catalog:

| Sandbox | Description |
|---------|-------------|
| `base` | Foundational image with system tools and dev environment |
| `ollama` | Ollama with cloud and local model support, Claude Code, OpenCode, and Codex pre-installed. Use `ollama launch` inside the sandbox to start coding agents with zero config |
| `openclaw` | Open agent manipulation and control |
| `sdg` | Synthetic data generation workflows |

### Legible Community Sandboxes

These sandboxes are bundled with the Legible CLI and optimized for data science and analytics workflows:

| Sandbox | Description |
|---------|-------------|
| `legible-deepanalyze` | [DeepAnalyze](https://github.com/ruc-datalab/DeepAnalyze) — autonomous data science agent (8B LLM). Upload data files and get analyst-grade research reports, visualizations, and models. Includes WebUI v2 with local vLLM, HeyWhale, or any OpenAI-compatible API. GPU recommended. |

#### DeepAnalyze Quick Start

```bash
# With GPU — runs the 8B model locally via vLLM
legible agent create data-analyst --blueprint legible-deepanalyze --gpu

# Without GPU — uses an external OpenAI-compatible API
legible agent create data-analyst --blueprint legible-deepanalyze --profile openai
```

Once running, connect to the sandbox and start the WebUI:

```bash
legible agent connect data-analyst
# Inside the sandbox:
/opt/deepanalyze/start-webui.sh
```

The WebUI is available at `http://localhost:4000`. Upload CSV, Excel, JSON, or database exports and DeepAnalyze will autonomously analyze, model, and generate reports.

:::tip
The community catalog is designed to grow. Check the [OpenShell Community repository](https://github.com/NVIDIA/OpenShell-Community) for the latest additions.
:::

## Use a Community Sandbox

### With the Legible CLI

Create an agent using a community sandbox by passing `--from` with the sandbox name:

```bash
legible agent create my-analyst --from ollama
```

Behind the scenes, the CLI:

1. Resolves the name against the [OpenShell Community](https://github.com/NVIDIA/OpenShell-Community) repository
2. Pulls the Dockerfile, policy, skills, and any startup scripts
3. Builds the container image locally
4. Creates the sandbox with the bundled configuration and your Legible credentials applied

### With OpenShell Directly

You can also use the `openshell` CLI directly:

```bash
openshell sandbox create --from ollama
```

### Other Sources

The `--from` flag also accepts:

- **Local directory paths** — point to a directory containing a Dockerfile and optional policy/skills:

  ```bash
  legible agent create my-analyst --from ./my-sandbox-dir
  ```

- **Container image references** — use an existing container image directly:

  ```bash
  legible agent create my-analyst --from my-registry.example.com/my-image:latest
  ```

## Combining with Legible Blueprints

Community sandboxes and [Legible blueprints](/agents/blueprints) serve different purposes:

| | Community Sandboxes | Legible Blueprints |
|---|---|---|
| **Source** | NVIDIA OpenShell Community | Bundled with Legible CLI |
| **Scope** | General-purpose dev environments | Data-source-optimized agents |
| **Includes** | Dockerfile, policy, skills | Dockerfile, policy, inference profiles, resource limits |
| **Best for** | Custom agent runtimes, experimentation | Production data analytics agents |

You can use a community sandbox as the base image inside a custom blueprint by referencing it in your `blueprint.yaml`:

```yaml
version: "1.0"
components:
  sandbox:
    name: my-custom-agent
    image: community://ollama
    resources:
      cpus: 4.0
      memory: 16g
policies:
  network: ./policies/legible-sandbox.yaml
```

## Contribute a Community Sandbox

Each community sandbox is a directory under `sandboxes/` in the [OpenShell Community](https://github.com/NVIDIA/OpenShell-Community) repository. At minimum, a sandbox directory must contain:

- **`Dockerfile`** — defines the container image
- **`README.md`** — describes the sandbox and how to use it

You can also include:

- **`policy.yaml`** — default network policy applied when the sandbox launches
- **`skills/`** — agent skill definitions bundled with the sandbox
- **Startup scripts** — any scripts the Dockerfile or entrypoint invokes

To contribute:

1. Fork the [OpenShell Community](https://github.com/NVIDIA/OpenShell-Community) repository
2. Add your sandbox directory under `sandboxes/`
3. Open a pull request

Refer to the repository's [CONTRIBUTING.md](https://github.com/NVIDIA/OpenShell-Community/blob/main/CONTRIBUTING.md) for submission guidelines.

## Next Steps

- [Blueprints](/agents/blueprints) — pre-configured agent templates optimized for specific data sources
- [OpenShell](/agents/openshell) — underlying container isolation runtime
- [Gateways](/agents/gateways) — manage sandbox resources across your organization
