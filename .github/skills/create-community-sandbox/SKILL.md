---
name: create-community-sandbox
description: "Create a new Legible OpenShell community sandbox from an open-source GitHub project. Use when: packaging an external ML/data-science tool (model, framework, agent) as a Legible community sandbox, creating a new blueprint YAML, writing a sandbox Dockerfile, defining network policies, and adding the sandbox to docs. Covers the full pipeline from feasibility assessment to deployable sandbox."
argument-hint: "Provide the GitHub repo URL and which variant/mode to package (e.g. 'https://github.com/org/project — WebUI v2 mode')"
---

# Create a Community Sandbox from a GitHub Project

Repeatable process for packaging any open-source project as a Legible OpenShell community sandbox. Follow these steps in order.

## When to Use

- You want to package an external open-source project as a Legible sandbox
- The project has a Dockerfile, docker-compose, or clear install instructions
- You want it launchable via `legible agent create <name> --blueprint legible-<project>`

## Step 1: Feasibility Assessment

Before writing any code, verify the project is sandbox-compatible. Fetch and analyze:

1. **README.md** — look for install/setup instructions, dependencies, ports, GPU requirements
2. **requirements.txt / pyproject.toml / package.json** — dependency list
3. **Dockerfile** (if exists) — base image, build steps, exposed ports
4. **docker-compose.yml** (if exists) — multi-service architecture
5. **.env.example** — environment variables and configuration

### Feasibility Checklist

| Criterion | Required | Notes |
|-----------|----------|-------|
| Clear install instructions | Yes | Must be reproducible in a Dockerfile |
| Known ports | Yes | Need to know what ports to forward |
| License permits redistribution | Yes | Check LICENSE file (MIT, Apache, BSD = OK) |
| Runs in Docker | Strongly preferred | Existing Dockerfile is a bonus |
| Reasonable image size | Preferred | <30GB total is manageable |
| GPU optional or configurable | Preferred | Should work CPU-only with external API fallback |
| External API fallback | Preferred | Can use OpenAI/Anthropic instead of local model |

### Architecture Decision

Decide the sandbox architecture based on the project:

| Pattern | When to Use | Example |
|---------|-------------|---------|
| **Self-contained** | Project serves its own model + UI | DeepAnalyze with vLLM |
| **API-connected** | Project uses external APIs only | ChatGPT wrappers |
| **Multi-service** | Project needs DB + backend + frontend | Full-stack apps |
| **Model-only** | Project is just a model, no UI | Hugging Face models → pair with Legible UI |

## Step 2: Create Blueprint Directory

```
legible-cli/openshell/blueprints/legible-<name>/
├── blueprint.yaml           # Blueprint definition
├── Dockerfile               # Container image build
├── entrypoint.sh            # Sandbox entrypoint (configures Legible CLI creds)
├── start-<service>.sh       # Service startup scripts (one per service)
└── policies/
    └── legible-<name>.yaml  # Network policy
```

## Step 3: Write the Blueprint YAML

Use this template. All fields documented inline:

```yaml
# Legible Agent Blueprint — <Project Name>
#
# <One-line description of what the project does>
#
# Source: <github-url>
# Model:  <huggingface-url> (if applicable)
#
# Usage:
#   legible agent create my-agent --blueprint legible-<name>
#   legible agent create my-agent --blueprint legible-<name> --gpu

version: "0.2.0"
min_openshell_version: "0.0.21"
description: |
  <Multi-line description. Include key features, what data types
  it supports, and whether GPU is required or optional.>

supported_connectors:        # Which Legible data sources this works with
  - POSTGRES                 # List applicable connectors or omit if generic
  - DUCKDB

components:
  sandbox:
    image: "legible-<name>:latest"
    build:
      dockerfile: "Dockerfile"
      context: "."
    name: "legible-<name>"
    forward_ports:            # List ALL ports the project uses
      - 8000                  # Model API
      - 3000                  # UI
      - 9000                  # MCP
    env:                      # Default environment variables
      SOME_CONFIG: "value"
    resources:
      cpus: "4.0"            # Adjust based on project needs
      memory: "16g"          # GPU projects typically need 32g+
      disk: "50g"
      max_sandboxes: 10

  inference:
    profiles:
      local:                         # For projects with local model serving
        provider_type: "vllm"        # or "ollama", "tgi", etc.
        provider_name: "<name>-local"
        endpoint: "http://localhost:8000/v1"
        model: "<model-name>"
      openai:                        # Always include as fallback
        provider_type: "openai"
        provider_name: "openai-inference"
        endpoint: "https://api.openai.com/v1"
        model: "gpt-4o"
      anthropic:
        provider_type: "anthropic"
        provider_name: "anthropic-inference"
        endpoint: "https://api.anthropic.com/v1"
        model: "claude-sonnet-4-20250514"
      nvidia:
        provider_type: "nvidia"
        provider_name: "nvidia-inference"
        endpoint: "https://integrate.api.nvidia.com/v1"
        model: "nvidia/nemotron-3-super-120b-a12b"

  mcp:
    servers:
      legible:
        transport: "streamable-http"
        url: "http://host.docker.internal:9000/mcp"

  tools:
    install:                  # apt packages to pre-install
      - python3-dev
    scripts:
      - name: "start"
        command: "/opt/<name>/start.sh"
        description: "Start the service"
      - name: "healthcheck"
        command: "curl -sf http://localhost:<port>"
        description: "Check service health"

policies:
  network: "policies/legible-<name>.yaml"
  filesystem:
    read_only:
      - /usr
      - /lib
      - /proc
      - /opt/<name>
    read_write:
      - /home/sandbox
      - /workspace
      - /tmp
  process:
    deny_privilege_escalation: true
    run_as_user: sandbox
    run_as_group: sandbox

agent:
  type: "claude"
  allowed_types: [claude, codex, opencode, copilot]
  entrypoint: "/opt/<name>/entrypoint.sh"
```

## Step 4: Write the Dockerfile

### Patterns by Project Type

**Python + Node.js project (most common):**
```dockerfile
# Stage 1: Build frontend
FROM node:20-slim AS frontend-builder
RUN git clone --depth 1 <repo-url> /build/repo
WORKDIR /build/repo/<frontend-path>
RUN npm install && npm run build

# Stage 2: Runtime
FROM nvidia/cuda:12.1.0-devel-ubuntu22.04   # GPU projects
# FROM python:3.12-slim                     # CPU-only projects

# System deps → Python deps → Clone repo → Copy built frontend → Scripts → User
```

**Key rules:**
- Use multi-stage builds to minimize image size
- Pin dependency versions from requirements.txt
- Create a `sandbox` user (non-root)
- Clone repo to `/opt/<name>/repo`
- Scripts go in `/opt/<name>/`
- Workspace at `/workspace`, models at `/models`
- Always `EXPOSE` the ports listed in `forward_ports`

### Base Image Selection

| Scenario | Base Image |
|----------|------------|
| GPU + vLLM | `nvidia/cuda:12.1.0-devel-ubuntu22.04` |
| GPU + PyTorch only | `nvidia/cuda:12.1.0-runtime-ubuntu22.04` |
| CPU-only Python | `python:3.12-slim` |
| CPU-only Node.js | `node:20-slim` |
| Multi-language | `ubuntu:24.04` |

## Step 5: Write the Entrypoint

Every sandbox entrypoint must:

1. Configure Legible CLI from environment variables (`$LEGIBLE_ENDPOINT`, `$LEGIBLE_API_KEY`, `$LEGIBLE_PROJECT_ID`)
2. Print available commands
3. Optionally auto-start services
4. `exec "$@"` at the end

Template:
```bash
#!/bin/bash
set -e

# 1. Configure Legible CLI
if [ -n "$LEGIBLE_ENDPOINT" ] && [ -n "$LEGIBLE_API_KEY" ]; then
    mkdir -p ~/.legible
    cat > ~/.legible/config.yaml <<EOF
endpoint: ${LEGIBLE_ENDPOINT}
api_key: ${LEGIBLE_API_KEY}
project_id: "${LEGIBLE_PROJECT_ID:-}"
EOF
fi

# 2. Print help
echo "Available commands:"
echo "  /opt/<name>/start.sh — Start the service"

# 3. Auto-start (optional)
if [ "${AUTOSTART:-false}" = "true" ]; then
    /opt/<name>/start.sh &
fi

# 4. Hand off
exec "$@"
```

## Step 6: Write the Network Policy

Start from the base template. Every sandbox needs:

1. **legible_mcp** — access to Legible MCP server on `host.docker.internal:9000`
2. **legible_ui** — access to Legible UI API on `host.docker.internal:3000`

Then add project-specific policies:

3. **Model APIs** — if using external providers (OpenAI, Anthropic, NVIDIA, etc.)
4. **Package registries** — PyPI, npm if runtime installs are needed
5. **Internal services** — localhost ports for the project's own services
6. **Model downloads** — huggingface.co if models are downloaded at runtime
7. **Project-specific** — any other endpoints the project needs

**Security principle:** Whitelist only what's needed. Block everything else by default.

## Step 7: Update Documentation

### Add to Community Sandboxes page

Edit `docs-site/docs/agents/community-sandboxes.md`:
- Add a row to the **Legible Community Sandboxes** table
- Add a **Quick Start** subsection with example commands

### Update CLI docs (optional)

If the sandbox has unique CLI workflows, add examples to `docs-site/docs/guides/cli.md`.

## Step 8: Build and Test

```bash
# Build the image
cd legible-cli/openshell/blueprints/legible-<name>
docker build -t legible-<name>:latest .

# Test standalone (no OpenShell needed)
docker run --rm -it -p 4000:4000 -p 8200:8200 legible-<name>:latest

# Test via Legible CLI (requires OpenShell + gateway)
legible agent create test-<name> --blueprint legible-<name> --gpu
legible agent connect test-<name>
```

## Step 9: Rebuild CLI (optional)

If the blueprint is bundled with the CLI binary, rebuild:

```bash
cd legible-cli
go build -o build/legible .
```

## Information to Gather from Every GitHub Project

When evaluating a new project for sandboxing, collect:

| Item | Where to Find It | Why |
|------|-------------------|-----|
| Install commands | README "Quick Start" | Dockerfile RUN steps |
| Python version | pyproject.toml, setup.cfg, or README | Base image selection |
| Node.js version | package.json "engines" | Frontend build stage |
| Port numbers | README, docker-compose, .env | `forward_ports` in blueprint |
| GPU requirement | README, model card | Base image + resource limits |
| Model size | Hugging Face model card | Disk + memory requirements |
| Environment vars | .env.example, README | `env` in blueprint + entrypoint |
| License | LICENSE file | Must allow redistribution |
| External API support | README, config files | Inference profiles |
| Existing Docker files | docker/, Dockerfile | Reuse build steps |

## Reference: Existing Sandboxes

| Blueprint | Project | Pattern | GPU | Ports |
|-----------|---------|---------|-----|-------|
| `legible-deepanalyze` | [DeepAnalyze](https://github.com/ruc-datalab/DeepAnalyze) | Self-contained (vLLM + WebUI) | Optional | 4000, 8200, 8100, 8000 |
| `legible-analyst` | Built-in | API-connected | No | 9000 |
| `legible-postgres` | Built-in | API-connected + tools | No | 9000 |
