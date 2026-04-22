#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"

run_step() {
  local script_path="$1"
  echo "==> Running ${script_path}"
  "${ROOT_DIR}/${script_path}"
}

run_step "ism-data/postgres/scripts/apply_reviewed_remediations.sh"
run_step "ism-data/postgres/scripts/build_bridge_candidates_latest_view.sh"
run_step "ism-data/postgres/scripts/build_security_bridge.sh"
run_step "ism-data/postgres/scripts/build_curated_security_dim.sh"
run_step "ism-data/postgres/scripts/drop_curated_fact_views.sh"
run_step "ism-data/postgres/scripts/build_synth.sh"
run_step "ism-data/postgres/scripts/build_synth_accounts_clients.sh"
run_step "ism-data/postgres/scripts/build_curated_fact_views.sh"
run_step "ism-data/postgres/scripts/bridge_quality_report.sh"
run_step "ism-data/postgres/scripts/build_bridge_remediation_candidates.sh"
run_step "ism-data/postgres/scripts/build_bridge_candidates_latest_view.sh"

echo "Remediation pipeline rebuild complete."
