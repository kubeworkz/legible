import base64
from contextvars import ContextVar
import hashlib
import time
from dotenv import load_dotenv
import orjson
import json

import os
import httpx
from mcp.server.fastmcp import FastMCP
from mcp.types import ToolAnnotations

try:
    from dto import TableColumns
    from utils import dict_to_base64_string, json_to_base64_string
except ImportError:
    from app.dto import TableColumns
    from app.utils import dict_to_base64_string, json_to_base64_string

load_dotenv()

MCP_TRANSPORT = os.getenv("MCP_TRANSPORT", "stdio")
MCP_HOST = os.getenv("MCP_HOST", "0.0.0.0")
MCP_PORT = int(os.getenv("MCP_PORT", "9000"))

# ── Per-user auth via wren-ui (Phase 2) ─────────────────
# When WREN_UI_ENDPOINT is set, MCP requires a project API key (psk-...)
# in the Authorization header. The key is validated against wren-ui, which
# returns the project's MDL, connection info, and billing allowance.
WREN_UI_ENDPOINT = os.getenv("WREN_UI_ENDPOINT")  # e.g. http://wren-ui:3000
INTERNAL_SERVICE_TOKEN = os.getenv("INTERNAL_SERVICE_TOKEN", "")
AUTH_ENABLED = bool(WREN_UI_ENDPOINT and INTERNAL_SERVICE_TOKEN)

# Context variable for per-request project context (set by auth middleware)
_request_project_ctx: ContextVar[dict | None] = ContextVar("_request_project_ctx", default=None)

# Cache validated project contexts to avoid hitting wren-ui on every MCP call
# Key: sha256(api_key), Value: { ..., "expires_at": unix_timestamp }
_PROJECT_CTX_CACHE: dict[str, dict] = {}
_CACHE_TTL_SECONDS = 300  # 5 minutes


def _cache_key(api_key: str) -> str:
    return hashlib.sha256(api_key.encode()).hexdigest()


async def _validate_api_key(api_key: str) -> dict | None:
    """Validate a project API key against wren-ui and return project context.
    Returns dict on success, None on auth failure, or raises ValueError with
    upstream error for non-auth failures (e.g. DuckDB not supported)."""
    cache_k = _cache_key(api_key)
    cached = _PROJECT_CTX_CACHE.get(cache_k)
    if cached and cached.get("expires_at", 0) > time.time():
        return cached

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{WREN_UI_ENDPOINT}/api/v1/mcp/context",
                json={"apiKey": api_key},
                headers={"X-Service-Token": INTERNAL_SERVICE_TOKEN},
            )
        if resp.status_code == 401:
            return None
        if resp.status_code != 200:
            # Pass through upstream error (e.g. DuckDB not supported, no deployment)
            try:
                msg = resp.json().get("error", resp.text)
            except Exception:
                msg = resp.text
            raise ValueError(msg)
        ctx = resp.json()
        ctx["expires_at"] = time.time() + _CACHE_TTL_SECONDS
        _PROJECT_CTX_CACHE[cache_k] = ctx
        return ctx
    except ValueError:
        raise
    except Exception as e:
        print(f"Auth validation error: {e}")  # noqa: T201
        return None


async def _record_query_metering(project_ctx: dict, duration_ms: int = 0, sql_hash: str = "") -> None:
    """Fire-and-forget: report a query execution to wren-ui for billing."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(
                f"{WREN_UI_ENDPOINT}/api/v1/mcp/record-query",
                json={
                    "organizationId": project_ctx.get("organizationId"),
                    "projectId": project_ctx.get("projectId"),
                    "keyId": project_ctx.get("keyId"),
                    "durationMs": duration_ms,
                    "sqlHash": sql_hash,
                },
                headers={"X-Service-Token": INTERNAL_SERVICE_TOKEN},
            )
    except Exception:
        pass  # fire-and-forget


def _get_effective_context() -> tuple[str | None, str | None, dict | None]:
    """Return (data_source, manifest_base64, connection_info) for the current request.
    Uses per-request project context if auth is enabled, else global state."""
    project_ctx = _request_project_ctx.get()
    if project_ctx:
        return (
            project_ctx.get("dataSource"),
            project_ctx.get("manifestStr"),
            project_ctx.get("connectionInfo"),
        )
    return data_source, mdl_cache.get_base64(), connection_info


mcp = FastMCP("Wren Engine", host=MCP_HOST, port=MCP_PORT)

WREN_URL = os.getenv("WREN_URL", "localhost:8000")
USER_AGENT = "wren-app/1.0"
MDL_SCHEMA_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "mdl.schema.json")
connection_info_path = os.path.expanduser(os.getenv("CONNECTION_INFO_FILE", "~/.wren/connection_info.json"))
settings_path = os.path.expanduser(os.getenv("SETTINGS_FILE", "~/.wren/mcp-ui-settings.json"))
mdl_path = os.getenv("MDL_PATH")


class MdlCache:
    """
    Cache for MDL with pre-built indexes for O(1) lookups.
    Avoids repeated base64 decoding and O(n) linear searches.
    """

    def __init__(self):
        self._mdl_base64: str | None = None
        self._mdl_dict: dict | None = None
        self._model_index: dict[str, dict] = {}
        self._column_index: dict[str, dict[str, dict]] = {}
        self._table_names: list[str] = []

    def set_mdl(self, mdl_base64: str) -> None:
        """Set MDL and invalidate cached indexes."""
        self._mdl_base64 = mdl_base64
        self._mdl_dict = None
        self._model_index = {}
        self._column_index = {}
        self._table_names = []

    def get_base64(self) -> str | None:
        return self._mdl_base64

    def is_deployed(self) -> bool:
        return self._mdl_base64 is not None

    def _ensure_parsed(self) -> None:
        """Lazy parse and build indexes on first access."""
        if self._mdl_dict is not None:
            return

        if self._mdl_base64 is None:
            self._mdl_dict = {}
            return

        self._mdl_dict = orjson.loads(
            base64.b64decode(self._mdl_base64).decode("utf-8")
        )

        models = self._mdl_dict.get("models", [])
        self._model_index = {model["name"]: model for model in models}
        self._table_names = list(self._model_index.keys())

        for model_name, model in self._model_index.items():
            columns = model.get("columns", [])
            self._column_index[model_name] = {col["name"]: col for col in columns}

    def get_mdl_dict(self) -> dict:
        """Get parsed MDL dictionary."""
        self._ensure_parsed()
        return self._mdl_dict

    def get_table_names(self) -> list[str]:
        """Get list of table names. O(1) after first call."""
        self._ensure_parsed()
        return self._table_names

    def get_model(self, table_name: str) -> dict | None:
        """Get model by name. O(1) lookup."""
        self._ensure_parsed()
        return self._model_index.get(table_name)

    def get_column(self, table_name: str, column_name: str) -> dict | None:
        """Get column by table and column name. O(1) lookup."""
        self._ensure_parsed()
        table_columns = self._column_index.get(table_name)
        if table_columns is None:
            return None
        return table_columns.get(column_name)

    def get_columns_dict(self, table_name: str) -> dict[str, dict] | None:
        """Get all columns for a table as dict. O(1) lookup."""
        self._ensure_parsed()
        return self._column_index.get(table_name)

    def get_relationships(self) -> list:
        """Get relationships from MDL."""
        self._ensure_parsed()
        return self._mdl_dict.get("relationships", [])


mdl_cache = MdlCache()
data_source = None
connection_info = None
read_only_mode = False


def _get_mdl_cache() -> MdlCache:
    """Return the appropriate MdlCache for the current request context."""
    project_ctx = _request_project_ctx.get()
    if project_ctx and project_ctx.get("manifestStr"):
        cache = MdlCache()
        cache.set_mdl(project_ctx["manifestStr"])
        return cache
    return mdl_cache


def _read_only_error(tool_name: str) -> str:
    return f"ERROR: '{tool_name}' is disabled because read-only mode is active. Toggle it off in the Wren Engine Web UI."


def _load_settings() -> None:
    global read_only_mode
    try:
        with open(settings_path) as f:
            settings = json.load(f)
        read_only_mode = bool(settings.get("read_only_mode", False))
        print(f"Loaded settings {settings_path} (read_only_mode={read_only_mode})")  # noqa: T201
    except FileNotFoundError:
        pass


def _save_settings() -> None:
    try:
        os.makedirs(os.path.dirname(settings_path), exist_ok=True)
        with open(settings_path, "w") as f:
            json.dump({"read_only_mode": read_only_mode}, f, indent=2)
    except Exception as e:
        print(f"Warning: could not save settings to {settings_path}: {e}")  # noqa: T201


_load_settings()

if mdl_path:
    with open(mdl_path) as f:
        mdl_schema = json.load(f)
        data_source = mdl_schema["dataSource"].lower()
        mdl_cache.set_mdl(dict_to_base64_string(mdl_schema))
        models = mdl_schema.get("models", [])
        total_columns = sum(len(m.get("columns", [])) for m in models)
        print(f"Loaded MDL {f.name} ({len(models)} models, {total_columns} columns)")  # noqa: T201
else:
    print("No MDL_PATH environment variable found")

if connection_info_path:
    try:
        with open(connection_info_path) as f:
            _conn_data = json.load(f)
        _saved_ds = _conn_data.get("type")
        connection_info = _conn_data.get("properties", {})
        if _saved_ds and data_source is None:
            data_source = _saved_ds.lower()
        print(f"Loaded connection info {connection_info_path}")  # noqa: T201

        
    except FileNotFoundError:
        print(f"Connection info file not found at {connection_info_path}")
else:
    print("No CONNECTION_INFO_FILE environment variable found")


async def make_query_request(sql: str, dry_run: bool = False):
    eff_ds, eff_manifest, eff_conn = _get_effective_context()
    headers = {"User-Agent": USER_AGENT, "Accept": "application/json", "x-wren-fallback_disable": "true"}
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"http://{WREN_URL}/v3/connector/{eff_ds}/query?dryRun={dry_run}",
                headers=headers,
                json={
                    "sql": sql,
                    "manifestStr": eff_manifest,
                    "connectionInfo": eff_conn,
                },
                timeout=30,
            )
            return response
        except Exception as e:
            return e


async def make_table_list_request():
    eff_ds, _eff_manifest, eff_conn = _get_effective_context()
    headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"http://{WREN_URL}/v2/connector/{eff_ds}/metadata/tables",
                headers=headers,
                json={"connectionInfo": eff_conn},
            )
            return response.text
        except Exception as e:
            return e


async def make_constraints_list_request():
    eff_ds, _eff_manifest, eff_conn = _get_effective_context()
    headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"http://{WREN_URL}/v2/connector/{eff_ds}/metadata/constraints",
                headers=headers,
                json={"connectionInfo": eff_conn},
            )
            return response.text
        except Exception as e:
            return e

async def make_get_available_functions_request():
    eff_ds, _eff_manifest, _eff_conn = _get_effective_context()
    headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"http://{WREN_URL}/v3/connector/{eff_ds}/functions",
                headers=headers,
            )
            return response.text
        except Exception as e:
            return e

@mcp.resource("resource://mdl_json_schema")
async def get_mdl_json_schema() -> str:
    """
    Get the MDL JSON schema
    """
    with open(MDL_SCHEMA_PATH) as f:
        return f.read()


# TODO: should validate the MDL
@mcp.tool(
    annotations=ToolAnnotations(
        title="Deploy MDL",
        destructiveHint=True,
    ),
)
async def deploy(mdl_file_path: str) -> str:
    """
    Deploy the MDL JSON schema to Wren Engine by reading from a JSON file.

    Args:
        mdl_file_path: Absolute or relative path to the MDL JSON file (e.g. `target/mdl.json`).
                       Use `build_mdl_project` to generate this file from a YAML project directory.
    """
    if read_only_mode:
        return _read_only_error("deploy")
    global data_source
    expanded = os.path.expanduser(mdl_file_path)
    if not os.path.isfile(expanded):
        return f"ERROR: File not found: {mdl_file_path}"
    with open(expanded) as f:
        mdl_json = f.read()
    try:
        mdl_dict = orjson.loads(mdl_json)
    except Exception as e:
        return f"ERROR: Failed to parse JSON from {mdl_file_path}: {e}"
    data_source = mdl_dict.get("dataSource", "").lower()
    mdl_base64 = json_to_base64_string(mdl_json)
    mdl_cache.set_mdl(mdl_base64)
    return f"MDL deployed successfully from {mdl_file_path}"


@mcp.tool(
    annotations=ToolAnnotations(
        title="Deploy MDL Manifest",
        destructiveHint=True,
    ),
)
async def deploy_manifest(mdl: dict) -> str:
    """
    Deploy an MDL manifest dict directly to Wren Engine.

    Use this instead of `deploy` when the MDL is already in memory
    (e.g. after `mdl_validate_manifest`), avoiding an intermediate file write.

    Args:
        mdl: The MDL manifest as a dictionary.
    """
    if read_only_mode:
        return _read_only_error("deploy_manifest")
    global data_source
    data_source = mdl.get("dataSource", "").lower()
    mdl_base64 = dict_to_base64_string(mdl)
    mdl_cache.set_mdl(mdl_base64)
    models = mdl.get("models", [])
    total_columns = sum(len(m.get("columns", [])) for m in models)
    return f"MDL deployed successfully ({len(models)} models, {total_columns} columns)"


@mcp.tool(
    annotations=ToolAnnotations(
        title="Validate MDL Manifest",
        readOnlyHint=True,
    ),
)
async def mdl_validate_manifest(mdl: dict) -> str:
    """
    Validate an MDL manifest dict via ibis-server dry-plan.

    Sends the manifest to the ibis-server ``/v3/connector/dry-plan`` endpoint
    to verify that the MDL is structurally valid before deploying.

    Args:
        mdl: The MDL manifest as a dictionary.

    Returns:
        A string describing the validation result.
    """
    ibis_url = os.getenv("WREN_ENGINE_ENDPOINT", f"http://{WREN_URL}")
    manifest_str = base64.b64encode(json.dumps(mdl).encode()).decode()
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{ibis_url.rstrip('/')}/v3/connector/dry-plan",
                json={"manifestStr": manifest_str, "sql": "SELECT 1"},
                headers={"x-wren-fallback_disable": "true"},
            )
        if resp.status_code == 200:
            return (
                "MDL validation passed.\n"
                "→ Next: call `deploy_manifest(mdl=<manifest dict>)` to deploy."
            )
        return f"Dry-plan validation failed (HTTP {resp.status_code}): {resp.text[:300]}"
    except Exception as e:
        return f"Dry-plan request failed: {e}"


@mcp.tool(
    annotations=ToolAnnotations(
        title="Check Deployment Status",
        readOnlyHint=True,
    ),
)
async def is_deployed() -> str:
    """
    Check if the MDL JSON schema is deployed
    """
    if _get_mdl_cache().is_deployed():
        return "MDL is deployed"
    return "MDL is not deployed. Please deploy the MDL first"


@mcp.tool(
    annotations=ToolAnnotations(
        title="List Remote Constraints",
        readOnlyHint=True,
    ),
)
async def list_remote_constraints() -> str:
    """
    Get the available constraints of connected Database
    """
    if read_only_mode:
        return _read_only_error("list_remote_constraints")
    response = await make_constraints_list_request()
    return response


@mcp.tool(
    annotations=ToolAnnotations(
        title="List Remote Tables",
        readOnlyHint=True,
    ),
)
async def list_remote_tables() -> str:
    """
    Get the available tables of connected Database
    """
    if read_only_mode:
        return _read_only_error("list_remote_tables")
    response = await make_table_list_request()
    return response


@mcp.tool(
    annotations=ToolAnnotations(
        title="Execute Query",
        destructiveHint=True,
    ),
)
async def query(sql: str) -> str:
    """
    Query the Wren Engine with the given SQL query
    """
    # Check query allowance when auth is active
    project_ctx = _request_project_ctx.get()
    if project_ctx:
        allowance = project_ctx.get("queryAllowance", {})
        if not allowance.get("allowed", True):
            return f"ERROR: Query not allowed — {allowance.get('reason', 'quota exceeded')}"

    start_ms = time.time()
    response = await make_query_request(sql)
    duration_ms = int((time.time() - start_ms) * 1000)

    # Record metering if auth is active
    if project_ctx and AUTH_ENABLED and hasattr(response, 'status_code') and response.status_code == 200:
        sql_hash = hashlib.sha256(sql.encode()).hexdigest()[:16]
        await _record_query_metering(project_ctx, duration_ms, sql_hash)
        # Invalidate cache so next request re-checks allowance
        cache_k = _cache_key(project_ctx.get("_api_key", ""))
        _PROJECT_CTX_CACHE.pop(cache_k, None)

    return response.text


@mcp.tool(
    annotations=ToolAnnotations(
        title="Dry Run Query",
        readOnlyHint=True,
    ),
)
async def dry_run(sql: str) -> str:
    """
    Dry run the query in Wren Engine with the given SQL query.
    It's a cheap way to validate the query. It's better to have
    dry run before running the actual query.
    """
    try:
        response = await make_query_request(sql, True)
        return response.text
    except Exception as e:
        return e


@mcp.resource("wren://metadata/manifest")
async def get_full_manifest() -> str:
    """
    Get the current deployed manifest in Wren Engine
    """
    return base64.b64decode(_get_mdl_cache().get_base64()).decode("utf-8")


@mcp.tool(
    annotations=ToolAnnotations(
        title="Get Manifest",
        readOnlyHint=True,
    ),
)
async def get_manifest() -> str:
    """
    Get the current deployed manifest in Wren Engine.
    If the number of deployed tables and columns is small, then it's better to use this tool.
    Otherwise, use `get_available_tables` and `get_table_info` and `get_column_info` tools.
    """
    return base64.b64decode(_get_mdl_cache().get_base64()).decode("utf-8")


@mcp.resource("wren://metadata/tables")
async def get_available_tables_resource() -> str:
    """
    Get the available tables in Wren Engine
    """
    return _get_mdl_cache().get_table_names()


@mcp.tool(
    annotations=ToolAnnotations(
        title="Get Available Tables",
        readOnlyHint=True,
    ),
)
async def get_available_tables() -> list[str]:
    """
    Get the available tables in Wren Engine
    """
    return _get_mdl_cache().get_table_names()   


@mcp.tool(
    annotations=ToolAnnotations(
        title="Get Table Columns Info",
        readOnlyHint=True,
    ),
)
async def get_table_columns_info(
    table_columns: list[TableColumns], full_column_info: bool = False
) -> str:
    """
    Batch get the column info for the given table and column names in Wren Engine
    If the number of deployed tables and columns is huge, then it's better to use this tool to get only the required table and column info.

    Given a `TableColumns` object, if the columns isn't provided, then it will return all columns of the table.
    If the columns is not None, then it will return only the given columns of the table.
    If the `full_column_info` is True, then it will return the full column info, otherwise only the column name.
    """
    result = []
    for table_column in table_columns:
        _mc = _get_mdl_cache()
        model = _mc.get_model(table_column.table_name)
        if model is None:
            return f"Table not found: {table_column.table_name}"

        columns_dict = _mc.get_columns_dict(table_column.table_name)

        if table_column.column_names and len(table_column.column_names) > 0:
            columns = []
            missed_columns = []
            for col_name in table_column.column_names:
                col = columns_dict.get(col_name)
                if col is not None:
                    columns.append(col)
                else:
                    missed_columns.append(col_name)

            if len(missed_columns) > 0:
                return f"Table {table_column.table_name}'s columns not found: {set(missed_columns)}"
        else:
            columns = list(columns_dict.values())

        if not full_column_info:
            columns = [col["name"] for col in columns]

        result.append({"table_name": table_column.table_name, "columns": columns})
    return orjson.dumps(result).decode("utf-8")


@mcp.tool(
    annotations=ToolAnnotations(
        title="Get Table Info",
        readOnlyHint=True,
    ),
)
async def get_table_info(table_name: str) -> str:
    """
    Get the table info for the given table name in Wren Engine
    """
    model = _get_mdl_cache().get_model(table_name)
    if model is None:
        return orjson.dumps([]).decode("utf-8")

    result = model.copy()
    result["columns"] = [col["name"] for col in model.get("columns", [])]
    return orjson.dumps([result]).decode("utf-8")


@mcp.tool(
    annotations=ToolAnnotations(
        title="Get Column Info",
        readOnlyHint=True,
    ),
)
async def get_column_info(table_name: str, column_name: str) -> str:
    """
    Get the column info for the given table and column name in Wren Engine
    """
    _mc = _get_mdl_cache()
    model = _mc.get_model(table_name)
    if model is None:
        return "Table not found"

    column = _mc.get_column(table_name, column_name)
    if column is None:
        return "Column not found"

    return orjson.dumps(column).decode("utf-8")


@mcp.tool(
    annotations=ToolAnnotations(
        title="Get Relationships",
        readOnlyHint=True,
    ),
)
async def get_relationships() -> str:
    """
    Get the relationships in Wren Engine
    """
    return orjson.dumps(_get_mdl_cache().get_relationships()).decode("utf-8")


@mcp.tool(
    annotations=ToolAnnotations(
        title="Get Available Functions",
        readOnlyHint=True,
    ),
)
async def get_available_functions() -> str:
    """
    Get the available functions of connected DataSource Type
    """
    response = await make_get_available_functions_request()
    return response

@mcp.tool(
    annotations=ToolAnnotations(
        title="Get Data Source Type",
        readOnlyHint=True,
    ),
)
async def get_current_data_source_type() -> str:
    """
    Get the current data source type
    """
    eff_ds, _, _ = _get_effective_context()
    if eff_ds is None:
        return "No data source connected. Please deploy the MDL first and assign `dataSource` field."
    return eff_ds

@mcp.tool(
    annotations=ToolAnnotations(
        title="Get Wren Guide",
        readOnlyHint=True,
    ),
)
async def get_wren_guide() -> str:
    """
    Understand how to use Wren Engine effectively to query your database
    """

    if data_source is None:
        return """
    Wren Engine is not yet configured. To get started:

    ## Quick Setup
    1. Call `generate_mdl` with your database connection string:
       e.g. `postgresql://user:pass@host:5432/mydb`
       The agent will explore your schema, build an MDL, configure the
       connection, and deploy — all automatically.

    2. Once deployed, you can start querying with natural language or SQL.

    ## Manual Setup (if you already have an MDL file)
    1. Call `deploy(mdl_file_path=<path>)` to load the MDL.
    2. Configure your database connection via the Web UI (available on the MCP server's web port).
    3. Call `health_check()` to verify everything is working.
    """

    tips = f"""
    ## Tips for using Wren Engine with {data_source.capitalize()}
    You are connected to a {data_source.capitalize()} database via Wren Engine.
    Here are some tips to use {data_source.capitalize()} effectively:
    """

    if data_source == "snowflake":
        tips += """
        1. Snowflake supports semi-structured data types like VARIANT, OBJECT, and ARRAY. You can use these data types to store and query JSON data.
        2. Snowflake has a rich set of built-in functions to process semi-structured data. You can use functions like GET_PATH, TO_VARIANT, TO_ARRAY, etc.
        3. For process semi-structure data type (e.g. `VARIANT`), you can use `get_path` function to extract the value from the semi-structure data.
        4. For process array data type (e.g. `ARRAY`), you can use `UNNEST` function to flatten the array data. `UNNEST` only accepts array column as input. If you extract an array value by `get_path` function, you need to cast it to array type (by `to_array` function) before using `UNNEST`.
        """
    else:
        tips += f"""
        1. Use {data_source.capitalize()}'s specific functions and features to optimize your queries.
        2. Refer to {data_source.capitalize()}'s documentation for more details on how to use its features effectively.
        """

    return f"""
    Wren Engine is a semantic layer to help you query your database easily using SQL. It supports ANSI SQL to query your database.
    Wren SQL doesn't equal to your database SQL. Wren Engine translates your Wren SQL to your database SQL internally.
    Avoid to use database specific SQL syntax in your Wren SQL.
    The models you can access are defined in the MDL (Model Definition Language) schema you deployed.

    Here are some tips to use Wren Engine effectively:
    1. Use simple SQL queries to get data from your tables. You can use SELECT, WHERE, JOIN, GROUP BY, ORDER BY, etc.
    2. Use table and column names as defined in the MDL schema.
    3. Use aliases to make your queries more readable.
    4. Use functions supported by your data source type. You can get the list of available functions using the `get_available_functions` tool.
    5. Avoid to use `LATERAL` statement in your queries, as Wren Engine may not support it well. Use normal `JOIN` or `CROSS JOIN UNNEST` instead.
    6. Check the tips below for some general tips and some tips specific to the connected DataSource Type.
    {tips}

    ## General Tips
    1. If you encounter any issues, please check the health of Wren Engine using the `health_check` tool.
    2. You can also get the deployed MDL schema using the `get_manifest` tool.
    3. If the number of deployed tables and columns is huge, you can use `get_available_tables`, `get_table_info`, and `get_column_info` tools to get only the required table and column info.
    4. You can validate your SQL query using the `dry_run` tool before running the actual query.
    """

@mcp.tool(
    annotations=ToolAnnotations(
        title="Health Check",
        readOnlyHint=True,
    ),
)
async def health_check() -> str:
    """
    Check the health of Wren Engine and validate required configuration.

    Returns a detailed status report including any missing configuration
    with actionable guidance on how to fix each issue.
    """
    issues: list[str] = []
    guidance: list[str] = []

    # Check MDL deployment
    _mc = _get_mdl_cache()
    if not _mc.is_deployed():
        issues.append("MDL is not deployed")
        guidance.append(
            "- Deploy MDL: call `deploy(mdl_file_path=<path>)` with a path to your MDL JSON file, "
            "or `deploy_manifest(mdl=<dict>)` if the manifest is already in memory."
        )

    # Check connection info
    eff_ds, _eff_manifest, eff_conn = _get_effective_context()
    if eff_conn is None:
        issues.append("Database connection is not configured")
        guidance.append(
            "- Configure connection: open the Wren Engine Web UI and set your data source "
            "type (e.g. POSTGRES, BIGQUERY, DUCKDB) and credentials there."
        )

    # Check data source
    if eff_ds is None:
        issues.append("Data source type is not set")
        guidance.append(
            "- Set data source: deploy an MDL that has a `dataSource` field, "
            "or configure the connection via the Wren Engine Web UI."
        )

    if issues:
        lines = ["Wren Engine is not ready. The following issues must be resolved:\n"]
        for i, issue in enumerate(issues, 1):
            lines.append(f"{i}. {issue}")
        lines.append("\nHow to fix:")
        lines.extend(guidance)
        return "\n".join(lines)

    # All config present — verify ibis-server connectivity
    try:
        response = await make_query_request("SELECT 1")
        if response.status_code == 200:
            return f"Wren Engine is healthy (data source: {data_source}, MDL deployed: yes)"
        else:
            return (
                f"Wren Engine configuration is complete but ibis-server returned an error "
                f"(HTTP {response.status_code}). Ensure ibis-server is running at {WREN_URL}."
            )
    except Exception as e:
        return (
            f"Wren Engine configuration is complete but ibis-server is unreachable at {WREN_URL}. "
            f"Ensure ibis-server is running. Error: {e}"
        )


@mcp.tool(
    annotations=ToolAnnotations(
        title="Get Version",
        readOnlyHint=True,
    ),
)
def get_version() -> str:
    """Return the current version of the Wren MCP server."""
    try:
        from importlib.metadata import version

        return version("mcp-server")
    except Exception:
        pass
    try:
        pyproject = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "pyproject.toml")
        with open(pyproject, "rb") as f:
            for line in f:
                decoded = line.decode()
                if decoded.startswith("version"):
                    return decoded.split('"')[1]
    except Exception:
        pass
    return "unknown"


WEB_UI_PORT = int(os.getenv("WEB_UI_PORT", "9001"))
WEB_UI_ENABLED = os.getenv("WEB_UI_ENABLED", "true").lower() != "false"


def _web_get_state() -> dict:
    mdl_dict = mdl_cache.get_mdl_dict() if mdl_cache.is_deployed() else {}
    models = mdl_dict.get("models", [])
    return {
        "data_source": data_source,
        "connection_info": connection_info,
        "is_deployed": mdl_cache.is_deployed(),
        "model_count": len(models),
        "column_count": sum(len(m.get("columns", [])) for m in models),
        "mdl_path": mdl_path,
        "connection_info_path": connection_info_path,
        "mdl_dict": mdl_dict,
        "wren_url": WREN_URL,
        "read_only_mode": read_only_mode,
    }


def _web_set_read_only_mode(enabled: bool) -> None:
    global read_only_mode
    read_only_mode = enabled
    _save_settings()


def _web_set_connection(ds: str, conn_info: dict) -> None:
    global data_source, connection_info
    data_source = ds.lower()
    connection_info = conn_info


def _web_deploy_from_dict(mdl_dict: dict) -> tuple[bool, str]:
    global data_source
    data_source = mdl_dict.get("dataSource", "").lower()
    mdl_cache.set_mdl(dict_to_base64_string(mdl_dict))
    models = mdl_dict.get("models", [])
    total_columns = sum(len(m.get("columns", [])) for m in models)
    if mdl_path:
        try:
            with open(mdl_path, "w") as f:
                json.dump(mdl_dict, f, indent=2)
        except Exception:
            pass  # best-effort write-back
    return True, f"{len(models)} models, {total_columns} columns"


if WEB_UI_ENABLED:
    try:
        from web import init as _web_init, start as _web_start
    except ImportError:
        from app.web import init as _web_init, start as _web_start
    _web_init(_web_get_state, _web_set_connection, _web_deploy_from_dict, _web_set_read_only_mode)
    _web_start(host=MCP_HOST, port=WEB_UI_PORT)


# ── Auth-aware startup ──────────────────────────────────
# When AUTH_ENABLED, wrap the Starlette app with middleware that validates
# the Bearer token on every request to /mcp and sets the per-request context.

if AUTH_ENABLED and MCP_TRANSPORT == "streamable-http":
    import asyncio
    import uvicorn
    from starlette.middleware.base import BaseHTTPMiddleware
    from starlette.requests import Request
    from starlette.responses import JSONResponse

    class McpAuthMiddleware(BaseHTTPMiddleware):
        async def dispatch(self, request: Request, call_next):
            # Only gate the /mcp endpoint
            if not request.url.path.startswith("/mcp"):
                return await call_next(request)

            auth_header = request.headers.get("authorization", "")
            if not auth_header.startswith("Bearer "):
                return JSONResponse(
                    {"error": "Authorization: Bearer <project-api-key> required"},
                    status_code=401,
                )

            api_key = auth_header[7:].strip()
            if not api_key.startswith("psk-"):
                return JSONResponse(
                    {"error": "Only project API keys (psk-...) are accepted"},
                    status_code=401,
                )

            try:
                project_ctx = await _validate_api_key(api_key)
            except ValueError as e:
                return JSONResponse(
                    {"error": str(e)},
                    status_code=400,
                )
            if project_ctx is None:
                return JSONResponse(
                    {"error": "Invalid or expired API key"},
                    status_code=401,
                )

            # Store the raw key for cache invalidation in query metering
            project_ctx["_api_key"] = api_key

            # Set context variable for this request
            token = _request_project_ctx.set(project_ctx)
            try:
                response = await call_next(request)
                return response
            finally:
                _request_project_ctx.reset(token)

    async def _run_with_auth():
        starlette_app = mcp.streamable_http_app()
        starlette_app.add_middleware(McpAuthMiddleware)

        config = uvicorn.Config(
            starlette_app,
            host=MCP_HOST,
            port=MCP_PORT,
            log_level="info",
        )
        server = uvicorn.Server(config)
        await server.serve()

    if __name__ == "__main__":
        print(f"MCP auth enabled (wren-ui: {WREN_UI_ENDPOINT})")  # noqa: T201
        asyncio.run(_run_with_auth())
else:
    if __name__ == "__main__":
        mcp.run(transport=MCP_TRANSPORT)
