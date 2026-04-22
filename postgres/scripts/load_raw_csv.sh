#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
DATA_DIR="${1:-${ROOT_DIR}/ism-data}"
COMPOSE_FILE="${ROOT_DIR}/docker/docker-compose-dev.yaml"
PG_SERVICE="${PG_SERVICE:-ism-postgres}"
PG_DB="${PG_DB:-ISM}"
PG_USER="${PG_USER:-ism_admin}"

if [[ ! -d "${DATA_DIR}" ]]; then
  echo "Data directory not found: ${DATA_DIR}" >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker command not found" >&2
  exit 1
fi

copy_sql() {
  local sql="$1"
  docker compose -f "${COMPOSE_FILE}" exec -T "${PG_SERVICE}" \
    psql -v ON_ERROR_STOP=1 -U "${PG_USER}" -d "${PG_DB}" -c "${sql}" >/dev/null
}

# Ensure the service is running before loading files.
docker compose -f "${COMPOSE_FILE}" up -d "${PG_SERVICE}" >/dev/null

# Wait until postgres accepts connections.
for _ in {1..60}; do
  if docker compose -f "${COMPOSE_FILE}" exec -T "${PG_SERVICE}" \
    pg_isready -U "${PG_USER}" -d "${PG_DB}" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

shopt -s nullglob
csv_files=("${DATA_DIR}"/*.csv)

if [[ ${#csv_files[@]} -eq 0 ]]; then
  echo "No CSV files found in ${DATA_DIR}" >&2
  exit 1
fi

for file in "${csv_files[@]}"; do
  rel_path="/ism-data/$(basename "${file}")"
  table_name="$(basename "${file}" .csv | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/_/g; s/^_+//; s/_+$//')"

  header_json="$(python3 - "${file}" <<'PY'
import csv
import json
import re
import sys

path = sys.argv[1]

with open(path, newline="", encoding="utf-8-sig") as fh:
    reader = csv.reader(fh)
    try:
        row = next(reader)
    except StopIteration:
        row = []

seen = {}
cols = []
for i, raw in enumerate(row, start=1):
    name = raw.strip() or f"col_{i}"
    name = re.sub(r"\s+", "_", name)
    name = re.sub(r"[^0-9A-Za-z_]", "_", name)
    name = re.sub(r"_+", "_", name).strip("_")
    if not name:
        name = f"col_{i}"
    if re.match(r"^[0-9]", name):
        name = f"c_{name}"
    lower = name.lower()
    seen[lower] = seen.get(lower, 0) + 1
    if seen[lower] > 1:
        name = f"{name}_{seen[lower]}"
    cols.append(name.lower())

print(json.dumps(cols))
PY
)"

  col_defs="$(python3 - "${header_json}" <<'PY'
import json
import sys

cols = json.loads(sys.argv[1])
print(", ".join([f'"{c}" text' for c in cols]))
PY
)"

  col_list="$(python3 - "${header_json}" <<'PY'
import json
import sys

cols = json.loads(sys.argv[1])
print(", ".join([f'"{c}"' for c in cols]))
PY
)"

  if [[ -z "${col_defs}" ]]; then
    echo "Skipping empty or headerless file: $(basename "${file}")"
    continue
  fi

  echo "Loading ${table_name} from $(basename "${file}")"

  copy_sql "CREATE TABLE IF NOT EXISTS raw.\"${table_name}\" (${col_defs}, _source_file text NOT NULL DEFAULT '$(basename "${file}")', _loaded_at timestamptz NOT NULL DEFAULT now());"
  copy_sql "TRUNCATE TABLE raw.\"${table_name}\";"

  docker compose -f "${COMPOSE_FILE}" exec -T "${PG_SERVICE}" \
    psql -v ON_ERROR_STOP=1 -U "${PG_USER}" -d "${PG_DB}" -c "\\copy raw.\"${table_name}\" (${col_list}) FROM '${rel_path}' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8')" >/dev/null

  loaded_rows="$(docker compose -f "${COMPOSE_FILE}" exec -T "${PG_SERVICE}" \
    psql -t -A -U "${PG_USER}" -d "${PG_DB}" -c "SELECT count(*) FROM raw.\"${table_name}\";")"

  copy_sql "INSERT INTO ops.load_audit (table_name, source_file, loaded_rows) VALUES ('${table_name}', '$(basename "${file}")', ${loaded_rows});"
done

echo "Raw CSV load complete."
