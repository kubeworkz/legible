#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker/docker-compose-dev.yaml"
PG_SERVICE="${PG_SERVICE:-ism-postgres}"
PG_DB="${PG_DB:-ISM}"
PG_USER="${PG_USER:-ism_admin}"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker command not found" >&2
  exit 1
fi

docker compose -f "${COMPOSE_FILE}" up -d "${PG_SERVICE}" >/dev/null

for _ in {1..60}; do
  if docker compose -f "${COMPOSE_FILE}" exec -T "${PG_SERVICE}" \
    pg_isready -U "${PG_USER}" -d "${PG_DB}" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

docker compose -f "${COMPOSE_FILE}" exec -T "${PG_SERVICE}" \
  psql -U "${PG_USER}" -d "${PG_DB}" -c "
SELECT relname AS table_name, n_live_tup AS est_rows
FROM pg_stat_user_tables
WHERE schemaname = 'raw'
ORDER BY n_live_tup DESC, relname;
"

docker compose -f "${COMPOSE_FILE}" exec -T "${PG_SERVICE}" \
  psql -U "${PG_USER}" -d "${PG_DB}" -c "
SELECT table_name, source_file, loaded_rows, loaded_at
FROM ops.load_audit
ORDER BY loaded_at DESC
LIMIT 25;
"
