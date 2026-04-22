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

# Ensure Postgres service exists and is running.
docker compose -f "${COMPOSE_FILE}" up -d "${PG_SERVICE}" >/dev/null

# Wait until postgres accepts connections.
for _ in {1..60}; do
    if docker compose -f "${COMPOSE_FILE}" exec -T "${PG_SERVICE}" \
        pg_isready -U "${PG_USER}" -d "${PG_DB}" >/dev/null 2>&1; then
        break
    fi
    sleep 1
done

cat <<'SQL' | docker compose -f "${COMPOSE_FILE}" exec -T "${PG_SERVICE}" \
  psql -v ON_ERROR_STOP=1 -U "${PG_USER}" -d "${PG_DB}"
CREATE SCHEMA IF NOT EXISTS ops;

CREATE OR REPLACE FUNCTION ops.profile_single_column_uniqueness(
    p_schema text,
    p_tables text[] DEFAULT NULL
)
RETURNS TABLE (
    schema_name text,
    table_name text,
    column_name text,
    total_rows bigint,
    non_null_rows bigint,
    distinct_values bigint,
    uniqueness_ratio numeric,
    is_unique_non_null boolean
)
LANGUAGE plpgsql
AS $$
DECLARE
    rec record;
    r_total bigint;
    r_non_null bigint;
    r_distinct bigint;
BEGIN
    FOR rec IN
        SELECT c.table_schema, c.table_name, c.column_name
        FROM information_schema.columns c
        WHERE c.table_schema = p_schema
          AND (p_tables IS NULL OR c.table_name = ANY (p_tables))
        ORDER BY c.table_name, c.ordinal_position
    LOOP
        EXECUTE format('SELECT count(*) FROM %I.%I', rec.table_schema, rec.table_name)
            INTO r_total;

        EXECUTE format('SELECT count(%I) FROM %I.%I', rec.column_name, rec.table_schema, rec.table_name)
            INTO r_non_null;

        EXECUTE format('SELECT count(DISTINCT %I) FROM %I.%I', rec.column_name, rec.table_schema, rec.table_name)
            INTO r_distinct;

        schema_name := rec.table_schema;
        table_name := rec.table_name;
        column_name := rec.column_name;
        total_rows := r_total;
        non_null_rows := r_non_null;
        distinct_values := r_distinct;
        uniqueness_ratio := CASE
            WHEN r_non_null = 0 THEN 0
            ELSE round((r_distinct::numeric / r_non_null::numeric), 4)
        END;
        is_unique_non_null := (r_non_null = r_total AND r_distinct = r_total AND r_total > 0);

        RETURN NEXT;
    END LOOP;
END;
$$;

\echo ''
\echo '=== Raw anchor-table uniqueness profile ==='
SELECT *
FROM ops.profile_single_column_uniqueness(
    'raw',
    ARRAY['apdclrt','apdclct','apdadrt','smdsdrt','calc','bk']
)
ORDER BY table_name, uniqueness_ratio DESC, column_name;

\echo ''
\echo '=== Likely duplicate checks for candidate entity keys ==='
\echo '-- raw.apdclrt by clientno'
SELECT count(*) AS duplicate_rows
FROM (
    SELECT clientno
    FROM raw.apdclrt
    WHERE btrim(clientno) <> ''
    GROUP BY clientno
    HAVING count(*) > 1
) d;

\echo '-- raw.apdadrt by accountno'
SELECT count(*) AS duplicate_rows
FROM (
    SELECT accountno
    FROM raw.apdadrt
    WHERE btrim(accountno) <> ''
    GROUP BY accountno
    HAVING count(*) > 1
) d;

\echo '-- raw.smdsdrt by secno'
SELECT count(*) AS duplicate_rows
FROM (
    SELECT secno
    FROM raw.smdsdrt
    WHERE btrim(secno) <> ''
    GROUP BY secno
    HAVING count(*) > 1
) d;
SQL

echo "Key profiling complete."
