#!/bin/bash
# sandbox-entrypoint.sh
#
# Configures the Legible CLI from OpenShell provider environment variables
# before handing off to the sandbox shell or agent.

set -e

# Configure legible CLI if provider injected credentials
if [ -n "$LEGIBLE_ENDPOINT" ] && [ -n "$LEGIBLE_API_KEY" ]; then
    mkdir -p ~/.legible
    cat > ~/.legible/config.yaml <<EOF
endpoint: ${LEGIBLE_ENDPOINT}
api_key: ${LEGIBLE_API_KEY}
project_id: ${LEGIBLE_PROJECT_ID:-}
EOF
    echo "[legible] CLI configured for ${LEGIBLE_ENDPOINT}"
fi

# Configure MCP connection if endpoint is set
if [ -n "$LEGIBLE_MCP_ENDPOINT" ]; then
    # Build optional db2i MCP server block
    DB2I_MCP_BLOCK=""
    if [ -n "$LEGIBLE_DB2I_MCP_ENDPOINT" ]; then
        DB2I_MCP_BLOCK=$(cat <<'BLOCK'
,
    "db2i": {
      "transport": "streamable-http",
      "url": "LEGIBLE_DB2I_MCP_ENDPOINT_PLACEHOLDER"
    }
BLOCK
)
        DB2I_MCP_BLOCK=$(echo "$DB2I_MCP_BLOCK" | sed "s|LEGIBLE_DB2I_MCP_ENDPOINT_PLACEHOLDER|${LEGIBLE_DB2I_MCP_ENDPOINT}|")
    fi

    cat > ~/.legible/mcp-config.json <<EOF
{
  "mcpServers": {
    "legible": {
      "transport": "streamable-http",
      "url": "${LEGIBLE_MCP_ENDPOINT}"
    }${DB2I_MCP_BLOCK}
  }
}
EOF
    echo "[legible] MCP endpoint configured: ${LEGIBLE_MCP_ENDPOINT}"
    if [ -n "$LEGIBLE_DB2I_MCP_ENDPOINT" ]; then
        echo "[legible] DB2i MCP endpoint configured: ${LEGIBLE_DB2I_MCP_ENDPOINT}"
    fi
fi

exec "$@"
