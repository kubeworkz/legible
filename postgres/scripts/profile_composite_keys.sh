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

cat <<'SQL' | docker compose -f "${COMPOSE_FILE}" exec -T "${PG_SERVICE}" \
  psql -v ON_ERROR_STOP=1 -U "${PG_USER}" -d "${PG_DB}"
\echo ''
\echo '=== core.trades composite key candidates ==='
SELECT
    'broker_no,account_no,trade_no,security_code,trade_ts' AS candidate_key,
    count(*) AS total_rows,
    count(DISTINCT (broker_no, account_no, trade_no, security_code, trade_ts)) AS distinct_groups,
    count(*) - count(DISTINCT (broker_no, account_no, trade_no, security_code, trade_ts)) AS duplicate_rows
FROM core.trades;

SELECT
    'account_no,trade_no,security_code,trade_ts' AS candidate_key,
    count(*) AS total_rows,
    count(DISTINCT (account_no, trade_no, security_code, trade_ts)) AS distinct_groups,
    count(*) - count(DISTINCT (account_no, trade_no, security_code, trade_ts)) AS duplicate_rows
FROM core.trades;

SELECT
    'account_no,trade_no,trade_ts' AS candidate_key,
    count(*) AS total_rows,
    count(DISTINCT (account_no, trade_no, trade_ts)) AS distinct_groups,
    count(*) - count(DISTINCT (account_no, trade_no, trade_ts)) AS duplicate_rows
FROM core.trades;

\echo ''
\echo '=== core.bookings composite key candidates ==='
SELECT
    'broker_no,account_no,txn_ref_id,txn_subseq,security_code,process_date' AS candidate_key,
    count(*) AS total_rows,
    count(DISTINCT (broker_no, account_no, txn_ref_id, txn_subseq, security_code, process_date)) AS distinct_groups,
    count(*) - count(DISTINCT (broker_no, account_no, txn_ref_id, txn_subseq, security_code, process_date)) AS duplicate_rows
FROM core.bookings;

SELECT
    'account_no,txn_ref_id,txn_subseq,security_code,process_date' AS candidate_key,
    count(*) AS total_rows,
    count(DISTINCT (account_no, txn_ref_id, txn_subseq, security_code, process_date)) AS distinct_groups,
    count(*) - count(DISTINCT (account_no, txn_ref_id, txn_subseq, security_code, process_date)) AS duplicate_rows
FROM core.bookings;

SELECT
    'account_no,txn_ref_id,txn_subseq,process_date' AS candidate_key,
    count(*) AS total_rows,
    count(DISTINCT (account_no, txn_ref_id, txn_subseq, process_date)) AS distinct_groups,
    count(*) - count(DISTINCT (account_no, txn_ref_id, txn_subseq, process_date)) AS duplicate_rows
FROM core.bookings;
SQL

echo "Composite key profiling complete."
