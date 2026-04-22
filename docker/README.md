## Service

- `wren-engine`: the engine service. check out example here: [wren-engine
  /example](https://github.com/Canner/wren-engine/tree/main/example)
- `wren-ai-service`: the AI service.
- `qdrant`: the vector store ai service is using.
- `legible-ui`: the UI service.
- `bootstrap`: put required files to volume for engine service.

## Volume

Shared data using `data` volume.

Path structure as following:

- `/mdl`
  - `*.json` (will put `sample.json` during bootstrap)
- `accounts`
- `config.properties`

## Network

- Check out [Network drivers overview](https://docs.docker.com/engine/network/drivers/) to learn more about `bridge` network driver.

## How to start with OpenAI

1. copy `.env.example` to `.env` and modify the OpenAI API key.
2. copy `config.example.yaml` to `config.yaml` for AI service configuration.
3. start all services: `docker-compose --env-file .env up -d`.
4. stop all services: `docker-compose --env-file .env down`.

### Optional

- If your port 3000 is occupied, you can modify the `HOST_PORT` in `.env`.

### Optional: ISM Postgres Database

An optional `ism-postgres` service is available in `docker-compose-dev.yaml` for building the ISM dataset from local CSV files.

1. Start only ISM Postgres:

```bash
docker compose --env-file .env -f docker-compose-dev.yaml up -d ism-postgres
```

2. From the repository root, load all CSV files into the `raw` schema:

```bash
./ism-data/postgres/scripts/load_raw_csv.sh
```

3. Profile loaded tables and audit history:

```bash
./ism-data/postgres/scripts/profile_raw.sh
```

4. Build initial core tables:

```bash
./ism-data/postgres/scripts/build_core.sh
```

5. Run candidate-key profiling:

```bash
./ism-data/postgres/scripts/profile_keys.sh
```

6. Build security bridge and registry:

```bash
./ism-data/postgres/scripts/build_security_bridge.sh
```

7. Apply safe core hardening constraints:

```bash
./ism-data/postgres/scripts/harden_core.sh
```

8. Profile composite key candidates:

```bash
./ism-data/postgres/scripts/profile_composite_keys.sh
```

9. Build first synthetic tables:

```bash
./ism-data/postgres/scripts/build_synth.sh
```

10. Generate bridge fallback quality diagnostics:

```bash
./ism-data/postgres/scripts/bridge_quality_report.sh
```

11. Build curated security dimension:

```bash
./ism-data/postgres/scripts/build_curated_security_dim.sh
```

12. Build synthetic account and client scaffolding:

```bash
./ism-data/postgres/scripts/build_synth_accounts_clients.sh
```

13. Build bridge remediation candidates:

```bash
./ism-data/postgres/scripts/build_bridge_remediation_candidates.sh
```

14. Build curated trade/booking fact views:

```bash
./ism-data/postgres/scripts/build_curated_fact_views.sh
```

15. Apply reviewed remediation candidates:

```bash
./ism-data/postgres/scripts/apply_reviewed_remediations.sh
```

16. Rebuild all downstream layers after remediation:

```bash
./ism-data/postgres/scripts/rebuild_after_remediation.sh
```

17. Build deduped latest remediation queue view:

```bash
./ism-data/postgres/scripts/build_bridge_candidates_latest_view.sh
```

18. Dry-run or batch-approve latest candidates:

```bash
./ism-data/postgres/scripts/approve_latest_candidates.sh
./ism-data/postgres/scripts/approve_latest_candidates.sh --limit 25 --reason-like self_code% --apply
./ism-data/postgres/scripts/approve_latest_candidates.sh --limit 25 --reason-like self_code% --min-occurrence 10 --exclude-code-like 0000% --apply
```

Details are documented in `../ism-data/postgres/README.md`.

## How to start with custom LLM

To start with a custom LLM, the process is similar to starting with OpenAI. The main difference is that you need to modify the `config.yaml` file
that we created on the previous step. After modifying the file, you can restart the services by running `docker-compose --env-file .env up -d --force-recreate wren-ai-service`.

For detailed information on how to modify the configuration for different LLM providers and models, please refer to the [AI Service Configuration](../wren-ai-service/docs/configuration.md).
This guide provides comprehensive instructions on setting up various LLM providers, embedders, and other components of the AI service.

## How to enable the DB2 for i MCP server

The `mcp-server-db2i` service provides AI agents with direct read-only access to IBM DB2 for i databases.

1. Uncomment the `mcp-server-db2i` service block in `docker-compose.yaml`.
2. Set the required environment variables in your `.env` file:

   ```bash
   # Required
   DB2I_HOSTNAME=your-ibm-i-host.com
   DB2I_USERNAME=your-username
   DB2I_PASSWORD=your-password

   # Optional
   DB2I_SCHEMA=your-default-schema
   DB2I_PORT=446
   DB2I_DATABASE=*LOCAL
   DB2I_MCP_PORT=9002
   DB2I_MCP_AUTH_MODE=token
   DB2I_MCP_AUTH_TOKEN=<generate with: openssl rand -hex 32>
   ```

3. Start the service: `docker-compose --env-file .env up -d mcp-server-db2i`.

The server exposes an HTTP MCP endpoint at `http://localhost:9002/mcp`. It only allows read-only SELECT queries. See the [mcp-server-db2i documentation](https://github.com/Strom-Capital/mcp-server-db2i) for full configuration options.
