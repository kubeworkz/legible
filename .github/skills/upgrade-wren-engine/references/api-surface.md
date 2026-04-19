# Wren Engine API Surface

Complete inventory of HTTP endpoints consumed by Legible from the wren-engine services. Use this to diff against upstream changes when upgrading.

## ibis-server — v3 Endpoints (Primary)

Base URL: `${IBIS_SERVER_ENDPOINT}/v3/connector`

`{source}` is the snake_case data source name (e.g. `postgres`, `big_query`, `click_house`).

### Consumed by legible-ui (`ibisAdaptor.ts`)

| Method | Path | Adaptor Method | Notes |
|--------|------|---------------|-------|
| POST | `/{source}/query` | `query()` | Query params: `?limit=N`, optional `?cacheEnable=true&overrideCache=true` |
| POST | `/{source}/query?dryRun=true` | `dryRun()` | Dry run validation |
| POST | `/{source}/dry-plan` | `getNativeSql()` | Get native SQL for a manifest query |
| POST | `/{source}/metadata/tables` | `getTables()` | List tables/columns |
| POST | `/{source}/metadata/constraints` | `getConstraints()` | Foreign key constraints |
| POST | `/{source}/validate/{rule_name}` | `validate()` | e.g. `column_is_valid` |
| POST | `/{source}/model-substitute` | `modelSubstitute()` | Model substitution |
| POST | `/{source}/metadata/version` | `getVersion()` | Data source version info |

### Consumed by wren-ai-service (`wren.py` — `IbisServer` class)

| Method | Path | Provider Method | Notes |
|--------|------|----------------|-------|
| POST | `/{source}/query` | `execute_sql()` | Query params: `?dryRun=true&limit=1` or `?limit=N` |
| POST | `/{source}/dry-plan` | `dry_plan()` | |
| GET | `/{source}/functions` | `get_func_list()` | List available functions |
| GET | `/{source}/knowledge` | `get_sql_knowledge()` | SQL knowledge base |

### Full v3 Router (all endpoints available upstream)

| Method | Path | Notes |
|--------|------|-------|
| POST | `/{data_source}/query` | Main query endpoint |
| POST | `/dry-plan` | Dry plan (no source prefix) |
| POST | `/{data_source}/dry-plan` | Dry plan (with source) |
| POST | `/{data_source}/validate/{rule_name}` | Validation rules |
| GET | `/{data_source}/functions` | Function catalog |
| GET | `/{data_source}/function/{function_name}` | Single function detail |
| POST | `/{data_source}/model-substitute` | Model substitution |
| GET | `/{data_source}/knowledge` | SQL knowledge |
| POST | `/{data_source}/metadata/tables` | Table metadata |
| POST | `/{data_source}/metadata/schemas` | Schema metadata |
| POST | `/{data_source}/metadata/constraints` | Constraint metadata |
| POST | `/{data_source}/metadata/version` | Version metadata |

## ibis-server — v2 Endpoints (Fallback)

Base URL: `${IBIS_SERVER_ENDPOINT}/v2/connector`

Used when `experimentalEngineRustVersion` is disabled in legible-ui.

### Consumed by legible-ui (`ibisAdaptor.ts`)

| Method | Path | Notes |
|--------|------|-------|
| POST | `/{source}/query` | Same as v3 |
| POST | `/{source}/validate/{rule_name}` | Same as v3 |
| POST | `/{source}/metadata/tables` | Same as v3 |
| POST | `/{source}/metadata/constraints` | Same as v3 |
| POST | `/{source}/metadata/version` | Same as v3 |
| POST | `/dry-plan` | No source prefix variant |
| POST | `/{source}/dry-plan` | With source prefix |
| POST | `/{source}/model-substitute` | Same as v3 |

### v2 Analysis Endpoints (Deprecated)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/v2/analysis/sql` | SQL analysis |
| GET | `/v2/analysis/sqls` | Multiple SQL analysis |

## wren-engine (Legacy Java) — v1 Endpoints

Base URL: `${WREN_ENGINE_ENDPOINT}/v1`

### Consumed by legible-ui (`wrenEngineAdaptor.ts`)

| Method | Path | Adaptor Method | Notes |
|--------|------|---------------|-------|
| PUT | `/data-source/duckdb/settings/init-sql` | `initDatabase()` | Plain-text body |
| PUT | `/data-source/duckdb/settings/session-sql` | `putSessionProps()` | Plain-text body |
| POST | `/data-source/duckdb/query` | `queryDuckdb()` | Plain-text SQL body |
| PATCH | `/config` | `patchConfig()` | JSON body |
| GET | `/mdl/preview` | `previewData()` | JSON body in GET request |
| GET | `/mdl/dry-plan` | `getNativeSQL()` | JSON body in GET request |
| GET | `/mdl/dry-run` | `dryRun()` | JSON body in GET request |
| POST | `/mdl/validate/column_is_valid` | `validateColumnIsValid()` | JSON body |
| GET | `/mdl/status` | `getDeployStatus()` | No body |

### Consumed by wren-ai-service (`wren.py` — `WrenEngine` class)

| Method | Path | Provider Method | Notes |
|--------|------|----------------|-------|
| GET | `/mdl/dry-run` | `execute_sql(dry_run=True)` | JSON body in GET request |
| GET | `/mdl/preview` | `execute_sql(dry_run=False)` | JSON body in GET request |

## Request/Response Patterns

### ibis-server Common Request Body

Most ibis-server endpoints accept:
```json
{
  "connectionInfo": { ... },
  "manifestStr": "<base64-encoded-MDL-JSON>",
  "sql": "SELECT ..."
}
```

### ibis-server Query Response

```json
{
  "columns": [{"name": "col1", "type": "VARCHAR"}],
  "data": [["value1"], ["value2"]],
  "dtypes": {"col1": "object"}
}
```

### Legacy Engine MDL Request Body

```json
{
  "manifest": { ... },
  "sql": "SELECT ...",
  "limit": 500
}
```

## How to Diff API Changes

After updating the submodule, run:

```bash
cd wren-engine

# Check ibis-server router changes
git diff <old-tag>..<new-tag> -- ibis-server/app/routers/

# Check for new/changed endpoint decorators
git diff <old-tag>..<new-tag> -- ibis-server/app/routers/ | grep -E '@router\.(get|post|put|patch|delete)'

# Check for new Pydantic models (request/response types)
git diff <old-tag>..<new-tag> -- ibis-server/app/model/

# Check legacy engine API changes
git diff <old-tag>..<new-tag> -- wren-core-legacy/

# Check MCP server changes
git diff <old-tag>..<new-tag> -- mcp-server/
```
