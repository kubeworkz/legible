---
sidebar_position: 6
title: Agent Builder
---

# Agent Builder

The Agent Builder lets you create custom AI agents powered by your semantic layer. Define an agent's behavior with a system prompt, choose an LLM model, publish versioned snapshots, and deploy the agent as an API endpoint — all from the CLI or the web UI.

## Concepts

| Concept | Description |
|---------|-------------|
| **Agent Definition** | A named configuration: system prompt, model, temperature, memory settings, and tool access |
| **Version** | An immutable snapshot created when you publish — lets you track changes and roll back |
| **Deploy** | Makes the agent available via REST API for external integrations |
| **Archive** | Soft-deletes the agent; it no longer appears in active lists |

### Lifecycle

```
create → (edit) → publish → deploy → (archive)
                     ↑          |
                     └──────────┘  (iterate: edit → publish → deploy)
```

Each publish bumps the version number. Deploying always uses the latest published version.

## CLI Commands

All commands are available under `legible agent-builder` (alias: `ab`).

### List Agent Definitions

```bash
legible ab list
```

```
ID  NAME             STATUS    VERSION  MODEL   CREATED
2   Chat Test Agent  deployed  v2       gpt-4o  2026-04-06 15:45
3   SQL Assistant     draft     v1       gpt-4o  2026-04-06 16:19
```

### Show Details

```bash
legible ab show 2
```

```
ID:             2
Name:           Chat Test Agent
Status:         deployed
Version:        v2
Model:          gpt-4o
Description:    An agent for chat testing
Temperature:    0.70
Max Tokens:     4096
System Prompt:  You are a helpful data analyst assistant.
Deployed At:    2026-04-06 15:01
Created:        2026-04-06 15:45
Updated:        2026-04-06 15:01
```

### Create an Agent

```bash
legible ab create \
  --name "Revenue Analyst" \
  --description "Answers revenue and sales questions" \
  --model gpt-4o \
  --system-prompt "You are a revenue analyst. Use the semantic layer to answer business questions accurately." \
  --temperature 0.3 \
  --max-tokens 4096 \
  --tags analytics,revenue
```

**Flags:**

| Flag | Required | Description |
|------|----------|-------------|
| `--name` | Yes | Agent name |
| `--description` | No | Short description |
| `--model` | No | LLM model identifier (e.g. `gpt-4o`, `claude-sonnet-4-20250514`) |
| `--system-prompt` | No | System prompt defining agent behavior |
| `--temperature` | No | Sampling temperature, 0.0–2.0 (default: 0.7) |
| `--max-tokens` | No | Maximum output tokens |
| `--tags` | No | Comma-separated tags for organization |

### Publish a Version

```bash
legible ab publish 5 --note "Added revenue KPI definitions"
```

Publishing creates an immutable version snapshot. The `--note` flag is optional but recommended for tracking changes.

### Deploy

```bash
legible ab deploy 5
```

Deploying makes the agent available via the REST API at `/api/v1/agents/<id>/sessions`. The agent must have at least one published version.

### Archive

```bash
legible ab archive 5
```

Archived agents are no longer active but can still be viewed with `ab show`.

### Version History

```bash
legible ab versions 2
```

```
VERSION  MODEL   CHANGE NOTE                  CREATED
v2       gpt-4o  Updated system prompt        2026-04-06 15:01
v1       gpt-4o  Initial version              2026-04-06 14:30
```

### Interactive Chat

```bash
legible ab chat 2
```

Opens an interactive REPL session with a deployed agent:

```
╭──────────────────────────────────────────────────╮
│ Chat with "Chat Test Agent" (v2) — session 1     │
╰──────────────────────────────────────────────────╯
Type your message and press Enter. Type "exit" to quit.

you> What was our total revenue last quarter?
  ⚙ Tool: run_sql
  ← {"total_revenue": 2450000, ...}
agent> Last quarter's total revenue was $2,450,000.

you> Break that down by region.
  ⚙ Tool: run_sql
  ← {"rows": [{"region": "North America", ...}, ...]}
agent> Here's the regional breakdown:
  - North America: $1,200,000
  - Europe: $800,000
  - Asia Pacific: $450,000

you> exit
 INFO  Ending chat session.
```

The chat command:
- Creates a new session automatically
- Shows reasoning steps (tool calls, thinking) in gray
- Displays the final answer in green
- Supports `--json` for machine-readable output
- Requires the agent to be in `deployed` status

## REST API

Deployed agents expose a REST API for programmatic access. Authenticate with a project API key.

### Create a Session

```bash
curl -X POST https://your-server/api/v1/agents/2/sessions \
  -H "Authorization: Bearer psk-your-project-key" \
  -H "X-Project-Id: 13"
```

### Send a Message

```bash
curl -X POST https://your-server/api/v1/agents/2/sessions/1/messages \
  -H "Authorization: Bearer psk-your-project-key" \
  -H "X-Project-Id: 13" \
  -H "Content-Type: application/json" \
  -d '{"message": "What was our revenue last quarter?"}'
```

### List Messages

```bash
curl https://your-server/api/v1/agents/2/sessions/1/messages \
  -H "Authorization: Bearer psk-your-project-key" \
  -H "X-Project-Id: 13"
```

## JSON Output

All commands support `--json` for scripting and CI/CD pipelines:

```bash
legible ab list --json | jq '.[].name'
legible ab show 2 --json | jq '.status'
legible ab create --name "My Agent" --json | jq '.id'
```

## Tips

- **Iterate quickly**: Edit in the web UI, then `publish` and `deploy` from the CLI
- **Version everything**: Always publish with `--note` so you can track what changed
- **Test before deploying**: Use `ab chat` after deploying to verify agent behavior
- **Use tags**: Organize agents by team or domain with `--tags`
- **Automate**: Combine `--json` output with `jq` in shell scripts for CI/CD workflows
