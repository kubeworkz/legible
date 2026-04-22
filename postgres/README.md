# ISM Postgres Bootstrap

This folder provides a first runnable scaffold for building the `ISM` Postgres database from the CSV exports in [../](../).

## What it creates

- Schemas: `raw`, `core`, `curated`, `synth`, `ops`
- Audit table: `ops.load_audit`
- Bulk loader for all `*.csv` files into `raw.*`

## Prerequisites

- Docker with `docker compose`
- Linux or macOS shell

## 1. Start ISM Postgres

From the repository root:

```bash
docker compose -f docker/docker-compose-dev.yaml up -d ism-postgres
```

The database is initialized from [init/001_schemas.sql](init/001_schemas.sql).

## 2. Load all CSV files into raw schema

```bash
./ism-data/postgres/scripts/load_raw_csv.sh
```

Optional custom data path:

```bash
./ism-data/postgres/scripts/load_raw_csv.sh /absolute/path/to/ism-data
```

## 3. Profile loaded tables

```bash
./ism-data/postgres/scripts/profile_raw.sh
```

This prints:

- Raw table estimated row counts
- Last load audit entries

## 4. Build initial core models

```bash
./ism-data/postgres/scripts/build_core.sh
```

This builds initial `core` tables for:

- clients
- accounts
- client_accounts
- securities
- trades
- bookings

## 5. Discover candidate keys

```bash
./ism-data/postgres/scripts/profile_keys.sh
```

This prints:

- single-column uniqueness metrics on anchor raw tables
- duplicate counts for likely entity keys (`clientno`, `accountno`, `secno`)

## 6. Build security code bridge and registry

```bash
./ism-data/postgres/scripts/build_security_bridge.sh
```

This creates:

- `core.security_bridge`: code-to-canonical-security mapping with mapping rules
- `core.security_registry`: union of master securities and bridge-inferred securities
- `ops.security_bridge_snapshot`: bridge coverage snapshots

## 7. Harden core constraints (safe mode)

```bash
./ism-data/postgres/scripts/harden_core.sh
```

This step adds:

- unique index on `core.securities.security_no`
- composite unique indexes for `core.trades` and `core.bookings`
- relationship coverage snapshots in `ops.relationship_coverage`
- conditional FKs only when current data has zero unmatched references

## 8. Profile composite key candidates

```bash
./ism-data/postgres/scripts/profile_composite_keys.sh
```

This step compares duplicate rates across several candidate composite keys for `core.trades` and `core.bookings`.

## 9. Build first synthetic layer

```bash
./ism-data/postgres/scripts/build_synth.sh
```

This creates:

- mapping tables: `synth.security_map`, `synth.account_map`, `synth.broker_map`
- synthetic modeled tables: `synth.securities`, `synth.trades`, `synth.bookings`

The generation preserves joinability and approximate distributions while pseudonymizing key identifiers.
It uses `core.security_bridge` and `core.security_registry` to improve security-key coverage.

## 10. Run bridge quality report

```bash
./ism-data/postgres/scripts/bridge_quality_report.sh
```

This writes fallback-frequency diagnostics to `ops.bridge_fallback_frequency` and prints the top fallback codes by source frequency.

## 11. Build curated security dimension

```bash
./ism-data/postgres/scripts/build_curated_security_dim.sh
```

This builds `curated.dim_security` with source provenance and quality tiers:

- `master` -> `high`
- `bridge_fallback` -> `medium`
- `__UNKNOWN__` -> `low`

## 12. Build synthetic accounts and clients scaffold

```bash
./ism-data/postgres/scripts/build_synth_accounts_clients.sh
```

This builds:

- `synth.account_registry`
- `synth.client_registry`
- `synth.client_accounts`
- `synth.accounts`
- `synth.clients`
- `synth.client_account_links`

If core client/account entities are empty, it scaffolds deterministic fallback entities from transactional account coverage.

## 13. Build bridge remediation candidates

```bash
./ism-data/postgres/scripts/build_bridge_remediation_candidates.sh
```

This writes prioritized mapping suggestions to `ops.bridge_remediation_candidates` using latest fallback diagnostics and available source hints.

## 14. Build curated fact views

```bash
./ism-data/postgres/scripts/build_curated_fact_views.sh
```

This creates:

- `curated.fact_trades`
- `curated.fact_bookings`

Both views join facts to security, account, and client dimensions for training-ready analytical use.

## 15. Apply reviewed remediation candidates

```bash
./ism-data/postgres/scripts/apply_reviewed_remediations.sh
```

This promotes approved rows from `ops.bridge_remediation_candidates` into `ops.bridge_manual_overrides` and marks those candidates as `applied`.

Example approval update:

```sql
UPDATE ops.bridge_remediation_candidates
SET review_status = 'approved'
WHERE security_code = 'A21595'
	AND source_name = 'core.bookings';
```

## 16. Rebuild all downstream layers after remediation

```bash
./ism-data/postgres/scripts/rebuild_after_remediation.sh
```

This runs in sequence:

- apply reviewed remediations
- rebuild security bridge and curated security dim
- rebuild synth layers
- rebuild curated fact views
- refresh bridge quality report and remediation candidates

## 17. Build latest remediation candidate view

```bash
./ism-data/postgres/scripts/build_bridge_candidates_latest_view.sh
```

This creates `ops.bridge_remediation_candidates_latest`, a deduplicated current queue (one latest row per `source_name` + `security_code`) for cleaner approval workflows.

## 18. Batch-approve latest candidates (helper)

```bash
./ism-data/postgres/scripts/approve_latest_candidates.sh
```

Default behavior is dry-run preview only.

Apply approvals:

```bash
./ism-data/postgres/scripts/approve_latest_candidates.sh --limit 25 --reason-like self_code% --apply
```

Safer high-impact batch example (skip low-frequency and placeholder-like codes):

```bash
./ism-data/postgres/scripts/approve_latest_candidates.sh --limit 25 --reason-like self_code% --min-occurrence 10 --exclude-code-like 0000% --apply
```

Common filters:

- `--source core.bookings`
- `--min-confidence 0.7`
- `--reason-like self_code%`
- `--min-occurrence 10`
- `--exclude-code-like 0000%`

## Notes

- Raw table names are sanitized to lowercase snake_case from the CSV filename.
- Raw column names are sanitized from CSV headers and stored as `text` for the initial landing layer.
- Each load run truncates and reloads raw tables to keep repeatability simple in phase 1.
