#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker/docker-compose-dev.yaml"
PG_SERVICE="${PG_SERVICE:-ism-postgres}"
PG_DB="${PG_DB:-ISM}"
PG_USER="${PG_USER:-ism_admin}"
SQL_FILE="${ROOT_DIR}/ism-data/postgres/sql/101_build_synth.sql"

if [[ ! -f "${SQL_FILE}" ]]; then
  echo "Synthetic build SQL not found: ${SQL_FILE}" >&2
  exit 1
fi

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

cat "${SQL_FILE}" | docker compose -f "${COMPOSE_FILE}" exec -T "${PG_SERVICE}" \
  psql -v ON_ERROR_STOP=1 -U "${PG_USER}" -d "${PG_DB}"

echo "Synthetic data build complete."
