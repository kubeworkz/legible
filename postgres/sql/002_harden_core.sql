BEGIN;

CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS ops;

-- Baseline key hardening where current data quality supports it.
ALTER TABLE core.securities
    ALTER COLUMN security_no SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_core_securities_security_no
    ON core.securities (security_no);

CREATE UNIQUE INDEX IF NOT EXISTS uq_core_trades_composite
    ON core.trades (broker_no, account_no, trade_no, security_code, trade_ts);

CREATE UNIQUE INDEX IF NOT EXISTS uq_core_bookings_composite
    ON core.bookings (broker_no, account_no, txn_ref_id, txn_subseq, security_code, process_date);

-- Store relationship coverage snapshots to drive iterative model hardening.
CREATE TABLE IF NOT EXISTS ops.relationship_coverage (
    id bigserial PRIMARY KEY,
    measured_at timestamptz NOT NULL DEFAULT now(),
    relationship_name text NOT NULL,
    lhs_distinct_values bigint NOT NULL,
    matched_distinct_values bigint NOT NULL,
    unmatched_distinct_values bigint NOT NULL,
    match_ratio numeric(10,4) NOT NULL
);

WITH trade_codes AS (
    SELECT DISTINCT security_code
    FROM core.trades
    WHERE security_code IS NOT NULL AND btrim(security_code) <> ''
),
trade_matches AS (
    SELECT t.security_code
    FROM trade_codes t
    JOIN core.securities s ON s.security_no = t.security_code
),
agg AS (
    SELECT
        (SELECT count(*) FROM trade_codes) AS lhs_count,
        (SELECT count(*) FROM trade_matches) AS matched_count
)
INSERT INTO ops.relationship_coverage (
    relationship_name,
    lhs_distinct_values,
    matched_distinct_values,
    unmatched_distinct_values,
    match_ratio
)
SELECT
    'core.trades.security_code -> core.securities.security_no',
    lhs_count,
    matched_count,
    lhs_count - matched_count,
    CASE WHEN lhs_count = 0 THEN 0 ELSE round((matched_count::numeric / lhs_count::numeric), 4) END
FROM agg;

WITH booking_codes AS (
    SELECT DISTINCT security_code
    FROM core.bookings
    WHERE security_code IS NOT NULL AND btrim(security_code) <> ''
),
booking_matches AS (
    SELECT b.security_code
    FROM booking_codes b
    JOIN core.securities s ON s.security_no = b.security_code
),
agg AS (
    SELECT
        (SELECT count(*) FROM booking_codes) AS lhs_count,
        (SELECT count(*) FROM booking_matches) AS matched_count
)
INSERT INTO ops.relationship_coverage (
    relationship_name,
    lhs_distinct_values,
    matched_distinct_values,
    unmatched_distinct_values,
    match_ratio
)
SELECT
    'core.bookings.security_code -> core.securities.security_no',
    lhs_count,
    matched_count,
    lhs_count - matched_count,
    CASE WHEN lhs_count = 0 THEN 0 ELSE round((matched_count::numeric / lhs_count::numeric), 4) END
FROM agg;

-- Add strict FKs only when current data fully supports them.
DO $$
DECLARE
    trade_unmatched bigint;
    booking_unmatched bigint;
BEGIN
    SELECT count(*) INTO trade_unmatched
    FROM (
        SELECT DISTINCT t.security_code
        FROM core.trades t
        LEFT JOIN core.securities s ON s.security_no = t.security_code
        WHERE s.security_no IS NULL
          AND t.security_code IS NOT NULL
          AND btrim(t.security_code) <> ''
    ) x;

    IF trade_unmatched = 0 THEN
        IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'fk_core_trades_security_code'
        ) THEN
            EXECUTE 'ALTER TABLE core.trades ADD CONSTRAINT fk_core_trades_security_code FOREIGN KEY (security_code) REFERENCES core.securities (security_no)';
        END IF;
    ELSE
        RAISE NOTICE 'Skipping FK core.trades.security_code -> core.securities.security_no (% unmatched security codes)', trade_unmatched;
    END IF;

    SELECT count(*) INTO booking_unmatched
    FROM (
        SELECT DISTINCT b.security_code
        FROM core.bookings b
        LEFT JOIN core.securities s ON s.security_no = b.security_code
        WHERE s.security_no IS NULL
          AND b.security_code IS NOT NULL
          AND btrim(b.security_code) <> ''
    ) x;

    IF booking_unmatched = 0 THEN
        IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'fk_core_bookings_security_code'
        ) THEN
            EXECUTE 'ALTER TABLE core.bookings ADD CONSTRAINT fk_core_bookings_security_code FOREIGN KEY (security_code) REFERENCES core.securities (security_no)';
        END IF;
    ELSE
        RAISE NOTICE 'Skipping FK core.bookings.security_code -> core.securities.security_no (% unmatched security codes)', booking_unmatched;
    END IF;
END
$$;

COMMIT;
