BEGIN;

CREATE SCHEMA IF NOT EXISTS ops;

CREATE TABLE IF NOT EXISTS ops.bridge_fallback_frequency (
    id bigserial PRIMARY KEY,
    measured_at timestamptz NOT NULL DEFAULT now(),
    source_name text NOT NULL,
    security_code text NOT NULL,
    mapped_security_no text NOT NULL,
    mapping_rule text NOT NULL,
    occurrence_count bigint NOT NULL,
    distinct_accounts bigint NOT NULL,
    distinct_brokers bigint NOT NULL
);

WITH trade_fallback AS (
    SELECT
        'core.trades'::text AS source_name,
        b.security_code,
        b.mapped_security_no,
        b.mapping_rule,
        count(*) AS occurrence_count,
        count(DISTINCT t.account_no) AS distinct_accounts,
        count(DISTINCT t.broker_no) AS distinct_brokers
    FROM core.trades t
    JOIN core.security_bridge b ON b.security_code = COALESCE(NULLIF(btrim(t.security_code), ''), '__UNKNOWN__')
    WHERE b.mapping_rule = 'fallback_self_code'
    GROUP BY 1,2,3,4
),
booking_fallback AS (
    SELECT
        'core.bookings'::text AS source_name,
        b.security_code,
        b.mapped_security_no,
        b.mapping_rule,
        count(*) AS occurrence_count,
        count(DISTINCT k.account_no) AS distinct_accounts,
        count(DISTINCT k.broker_no) AS distinct_brokers
    FROM core.bookings k
    JOIN core.security_bridge b ON b.security_code = COALESCE(NULLIF(btrim(k.security_code), ''), '__UNKNOWN__')
    WHERE b.mapping_rule = 'fallback_self_code'
    GROUP BY 1,2,3,4
),
combined AS (
    SELECT * FROM trade_fallback
    UNION ALL
    SELECT * FROM booking_fallback
)
INSERT INTO ops.bridge_fallback_frequency (
    source_name,
    security_code,
    mapped_security_no,
    mapping_rule,
    occurrence_count,
    distinct_accounts,
    distinct_brokers
)
SELECT
    source_name,
    security_code,
    mapped_security_no,
    mapping_rule,
    occurrence_count,
    distinct_accounts,
    distinct_brokers
FROM combined;

COMMIT;
