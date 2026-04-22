#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker/docker-compose-dev.yaml"
PG_SERVICE="${PG_SERVICE:-ism-postgres}"
PG_DB="${PG_DB:-ISM}"
PG_USER="${PG_USER:-ism_admin}"

LIMIT=10
MIN_CONFIDENCE=0.5000
MIN_OCCURRENCE=1
SOURCE_NAME=""
REASON_LIKE=""
EXCLUDE_CODE_LIKE=""
APPLY=false

usage() {
  cat <<'EOF'
Usage: ./ism-data/postgres/scripts/approve_latest_candidates.sh [options]

Options:
  --limit <n>               Max number of pending latest candidates to target (default: 10)
  --min-confidence <num>    Minimum candidate_confidence threshold (default: 0.5000)
  --min-occurrence <n>      Minimum occurrence_count threshold (default: 1)
  --source <name>           Filter by source_name (e.g. core.bookings)
  --reason-like <pattern>   SQL ILIKE pattern for candidate_reason (e.g. self_code%)
  --exclude-code-like <p>   Exclude security_code values matching SQL ILIKE pattern
  --apply                   Apply updates (default is dry-run preview)
  --help                    Show this help

Examples:
  ./ism-data/postgres/scripts/approve_latest_candidates.sh
  ./ism-data/postgres/scripts/approve_latest_candidates.sh --limit 25 --source core.bookings --min-occurrence 10
  ./ism-data/postgres/scripts/approve_latest_candidates.sh --reason-like self_code% --exclude-code-like 0000% --apply
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --limit)
      LIMIT="$2"
      shift 2
      ;;
    --min-confidence)
      MIN_CONFIDENCE="$2"
      shift 2
      ;;
    --min-occurrence)
      MIN_OCCURRENCE="$2"
      shift 2
      ;;
    --source)
      SOURCE_NAME="$2"
      shift 2
      ;;
    --reason-like)
      REASON_LIKE="$2"
      shift 2
      ;;
    --exclude-code-like)
      EXCLUDE_CODE_LIKE="$2"
      shift 2
      ;;
    --apply)
      APPLY=true
      shift
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if ! [[ "$LIMIT" =~ ^[0-9]+$ ]] || [[ "$LIMIT" -lt 1 ]]; then
  echo "--limit must be a positive integer" >&2
  exit 1
fi

if ! [[ "$MIN_CONFIDENCE" =~ ^[0-9]+(\.[0-9]+)?$ ]]; then
  echo "--min-confidence must be numeric" >&2
  exit 1
fi

if ! [[ "$MIN_OCCURRENCE" =~ ^[0-9]+$ ]]; then
  echo "--min-occurrence must be a non-negative integer" >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker command not found" >&2
  exit 1
fi

docker compose -f "$COMPOSE_FILE" up -d "$PG_SERVICE" >/dev/null

for _ in {1..60}; do
  if docker compose -f "$COMPOSE_FILE" exec -T "$PG_SERVICE" \
    pg_isready -U "$PG_USER" -d "$PG_DB" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

escape_sql_literal() {
  printf "%s" "$1" | sed "s/'/''/g"
}

SOURCE_FILTER=""
REASON_FILTER=""
OCCURRENCE_FILTER="AND l.occurrence_count >= ${MIN_OCCURRENCE}"
CODE_FILTER=""

if [[ -n "$SOURCE_NAME" ]]; then
  SOURCE_ESCAPED="$(escape_sql_literal "$SOURCE_NAME")"
  SOURCE_FILTER="AND l.source_name = '${SOURCE_ESCAPED}'"
fi

if [[ -n "$REASON_LIKE" ]]; then
  REASON_ESCAPED="$(escape_sql_literal "$REASON_LIKE")"
  REASON_FILTER="AND l.candidate_reason ILIKE '${REASON_ESCAPED}'"
fi

if [[ -n "$EXCLUDE_CODE_LIKE" ]]; then
  CODE_ESCAPED="$(escape_sql_literal "$EXCLUDE_CODE_LIKE")"
  CODE_FILTER="AND l.security_code NOT ILIKE '${CODE_ESCAPED}'"
fi

read -r -d '' PREVIEW_SQL <<SQL || true
WITH picked AS (
    SELECT
        l.id,
        l.source_name,
        l.security_code,
        l.occurrence_count,
        l.candidate_security_no,
        l.candidate_reason,
        l.candidate_confidence
    FROM ops.bridge_remediation_candidates_latest l
    WHERE l.review_status = 'pending'
      AND l.candidate_confidence >= ${MIN_CONFIDENCE}
      ${OCCURRENCE_FILTER}
      ${SOURCE_FILTER}
      ${REASON_FILTER}
      ${CODE_FILTER}
    ORDER BY l.candidate_confidence DESC, l.occurrence_count DESC, l.id DESC
    LIMIT ${LIMIT}
)
SELECT *
FROM picked
ORDER BY candidate_confidence DESC, occurrence_count DESC, id DESC;
SQL

echo "==> Previewing candidate rows"
docker compose -f "$COMPOSE_FILE" exec -T "$PG_SERVICE" \
  psql -U "$PG_USER" -d "$PG_DB" -c "$PREVIEW_SQL"

if [[ "$APPLY" != true ]]; then
  echo "Dry run only. Re-run with --apply to approve the previewed rows."
  exit 0
fi

read -r -d '' APPLY_SQL <<SQL || true
WITH picked AS (
    SELECT l.id
    FROM ops.bridge_remediation_candidates_latest l
    WHERE l.review_status = 'pending'
      AND l.candidate_confidence >= ${MIN_CONFIDENCE}
      ${OCCURRENCE_FILTER}
      ${SOURCE_FILTER}
      ${REASON_FILTER}
      ${CODE_FILTER}
    ORDER BY l.candidate_confidence DESC, l.occurrence_count DESC, l.id DESC
    LIMIT ${LIMIT}
)
UPDATE ops.bridge_remediation_candidates c
SET review_status = 'approved'
WHERE c.id IN (SELECT id FROM picked);
SQL

echo "==> Applying approvals"
docker compose -f "$COMPOSE_FILE" exec -T "$PG_SERVICE" \
  psql -v ON_ERROR_STOP=1 -U "$PG_USER" -d "$PG_DB" -c "$APPLY_SQL"

docker compose -f "$COMPOSE_FILE" exec -T "$PG_SERVICE" \
  psql -U "$PG_USER" -d "$PG_DB" -c "
SELECT review_status, count(*) AS rows
FROM ops.bridge_remediation_candidates_latest
GROUP BY review_status
ORDER BY review_status;
"

echo "Approval update complete."
