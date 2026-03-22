---
sidebar_position: 3
title: On-Premises & Air-Gap
---

# On-Premises Deployment

Run Legible entirely within your own infrastructure — on-premise, in a private cloud VPC, or fully air-gapped. The LLM that powers SQL generation lives inside your network, not ours.

- **Zero data egress** — query text, schema metadata, and results never leave your perimeter
- **Air-gap compatible** — works without internet access
- **No third-party LLM API** — all inference is local
- **OpenAI-compatible runtime** — works with any `/v1/chat/completions` endpoint
- **Regulatory ready** — GDPR, HIPAA, SOC 2, ISO 27001, FedRAMP/ITAR/DFARS

---

## How It Works

Every component runs inside your boundary:

```
┌─────────────────────────────────────────────────────┐
│                YOUR INFRASTRUCTURE                   │
│                                                      │
│   User ──▶ Legible Web App ──▶ Legible API Server   │
│                                       │              │
│                           ┌───────────┴──────────┐   │
│                           ▼                      ▼   │
│                   AI / LLM Runtime         Your DBs  │
│                   (Ollama · vLLM ·        (Postgres · │
│                    Bedrock VPC ·           MySQL ·    │
│                    Azure Private)          ClickHouse)│
│                                                      │
└─────────────────────────────────────────────────────┘
```

Every LLM inference call stays inside your network. Query text, schema metadata, and results never leave your perimeter.

| What stays local | Why it matters |
|---|---|
| **Query text** | The natural language question is processed entirely within your infrastructure. Never transmitted externally. |
| **Schema metadata** | Table structures and relationships used for SQL generation never leave your network. |
| **Query results** | Returned directly to the user within your environment. No caching or logging by any third party. |

---

## On-Premises vs. Cloud NL-to-SQL

| Capability | Legible On-Premises | Cloud NL-to-SQL |
|---|:---:|:---:|
| LLM queries leave your network | **Never** | Always |
| Prompts stored by third-party provider | **Never** | Always |
| Schema metadata exposed externally | **Never** | Always |
| Works in air-gapped environments | **Yes** | No |
| Works without internet access | **Yes** | No |
| Passes SOC 2 / ISO 27001 data controls | **Yes** | Depends on vendor |
| HIPAA — no BAA required with LLM provider | **Yes** | No — BAA required |
| GDPR — no international data transfer risk | **Yes** | Depends on region |
| FedRAMP / ITAR / DFARS compatible | **Yes** | No commercial LLM qualifies |
| Vendor lock-in risk | **None** | High |
| Inference cost trajectory | **Declining** | Vendor-controlled |

---

## Supported LLM Runtimes

Legible integrates with any OpenAI-compatible inference endpoint, which means it works with every major local and private-cloud LLM runtime out of the box.

### Ollama (Local / On-Premise Server)

Zero-configuration local LLM serving. One command to download and run models. Ideal for development, evaluation, and smaller teams.

**Supported models:** Llama 3.1, Mistral, Qwen 2.5, Phi-3

```bash
# Install and start Ollama
curl -fsSL https://ollama.ai/install.sh | sh
ollama pull llama3.1:70b
```

Then configure Legible to use it in your `config.yaml`:

```yaml
type: ollama
models:
  - model: llama3.1:70b
    host: http://localhost:11434
```

### vLLM (On-Premise GPU Server) — Recommended

Production-grade serving with high throughput, batching, and quantization support. The enterprise standard for self-hosted LLM inference. Full OpenAI API compatibility.

```bash
pip install vllm
python -m vllm.entrypoints.openai.api_server \
  --model meta-llama/Meta-Llama-3.1-70B-Instruct \
  --tensor-parallel-size 2
```

Configure in `config.yaml`:

```yaml
type: openai
models:
  - model: meta-llama/Meta-Llama-3.1-70B-Instruct
    api_base: http://your-gpu-server:8000/v1
    api_key: "not-needed"
```

### Private Cloud Endpoints (VPC Isolated)

All major clouds offer managed private LLM endpoints with no data egress to model providers:

| Provider | Service | Isolation |
|---|---|---|
| AWS | Bedrock (VPC endpoint) | VPC isolated, no data egress |
| Azure | Azure AI Studio (Private Endpoint) | VNET peered, SOC 2 certified |
| GCP | Vertex AI | VPC-SC controls |

Configure as an OpenAI-compatible endpoint:

```yaml
type: openai
models:
  - model: anthropic.claude-3-sonnet
    api_base: https://bedrock-runtime.us-east-1.amazonaws.com
    api_key: ${AWS_ACCESS_KEY}
```

### Air-Gapped Deployment

For defence, government, and regulated financial environments that require complete network isolation. Legible runs entirely offline — no external DNS lookups, no telemetry, no update pings.

Delivered as self-contained Docker images or Kubernetes charts. See [Docker Deployment](./docker.md) and [Kubernetes Deployment](./kubernetes.md) for base setup, then apply these air-gap specific settings:

```bash
# Disable all telemetry
TELEMETRY_ENABLED=false

# Disable external update checks
WREN_AI_SERVICE_VERSION=pinned

# Pre-load model weights into your image or volume
# (no runtime downloads needed)
```

---

## Why On-Premises is Now Affordable

### Model quality has caught up

Llama 3.1 70B, Mistral Large, and Qwen 2.5 Coder match GPT-4-class performance on NL-to-SQL benchmarks. SQL generation is a bounded, well-defined task — exactly where open models excel.

### Hardware costs have collapsed

A single NVIDIA RTX 4090 (~$2,000) runs a 13B model comfortably. Cloud GPU spot instances for inference start at ~$0.20/hour. SQL queries take milliseconds — inference costs are negligible.

### Quantization makes models smaller

GGUF, AWQ, and GPTQ quantization cuts VRAM requirements by 50–75% with minimal quality loss. A model that once needed 40 GB now runs in 8–12 GB — standard mid-range GPU memory.

### The tooling is production-ready

Ollama, vLLM, and llama.cpp are production-grade runtimes with enterprise support. If you can run a Docker container, you can run a local LLM.

---

## Regulatory & Compliance

On-premise deployment directly satisfies the AI data processing requirements of the most demanding regulatory frameworks.

### GDPR / UK GDPR

No international data transfer risk. Personal data processed by the LLM never leaves your jurisdiction. No Article 46 mechanism required. No adequacy decision dependency for AI processing.

### HIPAA

No BAA required with LLM provider. Protected Health Information implicit in query text never reaches a third-party Business Associate. On-premise removes the BAA requirement for the AI inference layer entirely.

### SOC 2 Type II

AI inference within your trust boundary. All data processing occurs within your defined system boundary. LLM inference is treated identically to any other internal compute workload — no vendor risk assessment needed for the AI layer.

### ISO 27001

On-premise deployment satisfies A.13 (information transfer), A.15 (supplier relationships), and A.10 (cryptography) without requiring vendor risk assessment for the LLM layer.

### FedRAMP / ITAR / DFARS

For US federal contractors and defence suppliers, on-premise deployment in a FedRAMP-authorised environment satisfies CUI handling requirements. No commercial cloud LLM API currently meets these standards. Air-gap compatible by design.

### FCA / PRA / MAS / FINRA

Financial regulators are increasingly scrutinising third-party AI APIs for workloads involving customer data or MNPI. On-premise deployment removes this regulatory risk vector entirely.

---

## Industries

Legible on-premises is built for organisations that can't afford to send data outside their walls:

| Industry | Use case |
|---|---|
| **Financial Services** | Investment banks, asset managers, trading firms handling PII, transaction data, or material non-public information |
| **Healthcare & Life Sciences** | Hospitals, pharma, biotech firms working with patient records, clinical trial data, or genomic databases |
| **Government & Defence** | Classified workloads, CUI data, air-gapped environments. FedRAMP, ITAR, DFARS requirements met by design |
| **Legal & Professional Services** | Law firms and consultancies handling privileged client data, M&A deal information, or audit-subject financial records |
| **Critical Infrastructure** | Energy, utilities, and telecoms operators with OT/IT data that cannot leave internal networks |
| **Security-First Organisations** | Any company where third-party LLM APIs are out of scope. If your security team has banned ChatGPT for work use, Legible on-premise is the answer |

---

## Getting Started

1. Follow the [Docker Deployment](./docker.md) or [Kubernetes Deployment](./kubernetes.md) guide
2. Configure your local LLM runtime (Ollama, vLLM, or private cloud endpoint)
3. Set `TELEMETRY_ENABLED=false` for fully isolated deployments
4. Point Legible at your databases — everything stays on your network

For enterprise architecture review, model selection guidance, Helm chart customisation, SSO integration, and dedicated onboarding:

- **Enterprise sales:** [onprem@legiblequery.ai](mailto:onprem@legiblequery.ai)
- **General:** [hello@legiblequery.ai](mailto:hello@legiblequery.ai)
