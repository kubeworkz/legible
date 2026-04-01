#!/usr/bin/env bash
# Run connector health check against the live server
# Usage: ./run.sh [--base-url http://host:port]
#
# Environment variables:
#   AUTH_EMAIL     — login email    (default: dave@gridworkz.com)
#   AUTH_PASSWORD  — login password (default: Gridworkz1!)

set -euo pipefail
cd "$(dirname "$0")"

exec node connectorHealthCheck.mjs "$@"
