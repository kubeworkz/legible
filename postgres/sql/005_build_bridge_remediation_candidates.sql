BEGIN;

CREATE SCHEMA IF NOT EXISTS ops;

CREATE TABLE IF NOT EXISTS ops.bridge_remediation_candidates (
    id bigserial PRIMARY KEY,
    generated_at timestamptz NOT NULL DEFAULT now(),
    security_code text NOT NULL,
    source_name text NOT NULL,
    occurrence_count bigint NOT NULL,
    distinct_accounts bigint NOT NULL,
    distinct_brokers bigint NOT NULL,
    candidate_security_no text,
    candidate_reason text,
    candidate_confidence numeric(10,4) NOT NULL,
    review_status text NOT NULL DEFAULT 'pending'
);

WITH latest_fallback AS (
    SELECT
        source_name,
        security_code,
        occurrence_count,
        distinct_accounts,
        distinct_brokers
    FROM ops.bridge_fallback_frequency
    WHERE measured_at = (SELECT max(measured_at) FROM ops.bridge_fallback_frequency)
      AND security_code <> '__UNKNOWN__'
),
securities AS (
    SELECT
        security_no,
        regexp_replace(btrim(cusip), '[^0-9A-Za-z]', '', 'g') AS cusip_norm,
        btrim(symbol) AS symbol
    FROM core.securities
),
candidate_from_dasinv AS (
    SELECT
        lf.source_name,
        lf.security_code,
        lf.occurrence_count,
        lf.distinct_accounts,
        lf.distinct_brokers,
        min(s.security_no) AS candidate_security_no,
        'dasinv.cusip_right6 -> core.securities.cusip'::text AS candidate_reason,
        0.7000::numeric AS candidate_confidence
    FROM latest_fallback lf
    JOIN raw.dasinv d ON right(btrim(d.cusip), 6) = lf.security_code
    JOIN securities s ON s.cusip_norm = regexp_replace(btrim(d.cusip), '[^0-9A-Za-z]', '', 'g')
    GROUP BY lf.source_name, lf.security_code, lf.occurrence_count, lf.distinct_accounts, lf.distinct_brokers
),
candidate_from_smdsdsy_symbol AS (
    SELECT
        lf.source_name,
        lf.security_code,
        lf.occurrence_count,
        lf.distinct_accounts,
        lf.distinct_brokers,
        min(s.security_no) AS candidate_security_no,
        'smdsdsy.symbol -> core.securities.symbol'::text AS candidate_reason,
        0.6000::numeric AS candidate_confidence
    FROM latest_fallback lf
    JOIN raw.smdsdsy y ON btrim(y.secno) = lf.security_code
    JOIN securities s ON s.symbol = btrim(y.symbol)
    GROUP BY lf.source_name, lf.security_code, lf.occurrence_count, lf.distinct_accounts, lf.distinct_brokers
),
candidate_from_calc_cusip AS (
    SELECT
        lf.source_name,
        lf.security_code,
        lf.occurrence_count,
        lf.distinct_accounts,
        lf.distinct_brokers,
        min(s.security_no) AS candidate_security_no,
        'calc.dcscusip -> core.securities.cusip'::text AS candidate_reason,
        0.9000::numeric AS candidate_confidence
    FROM latest_fallback lf
    JOIN raw.calc c ON btrim(c.seccode) = lf.security_code
    JOIN securities s ON s.cusip_norm = regexp_replace(btrim(c.dcscusip), '[^0-9A-Za-z]', '', 'g')
    WHERE btrim(c.dcscusip) <> ''
    GROUP BY lf.source_name, lf.security_code, lf.occurrence_count, lf.distinct_accounts, lf.distinct_brokers
),
unioned AS (
    SELECT * FROM candidate_from_calc_cusip
    UNION ALL
    SELECT * FROM candidate_from_dasinv
    UNION ALL
    SELECT * FROM candidate_from_smdsdsy_symbol
    UNION ALL
    SELECT
        lf.source_name,
        lf.security_code,
        lf.occurrence_count,
        lf.distinct_accounts,
        lf.distinct_brokers,
        lf.security_code AS candidate_security_no,
        'self_code_promote_to_registry'::text AS candidate_reason,
        0.5000::numeric AS candidate_confidence
    FROM latest_fallback lf
    WHERE lf.security_code <> '__UNKNOWN__'
    UNION ALL
    SELECT
        lf.source_name,
        lf.security_code,
        lf.occurrence_count,
        lf.distinct_accounts,
        lf.distinct_brokers,
        '__UNKNOWN__'::text AS candidate_security_no,
        'route_to_unknown_bucket'::text AS candidate_reason,
        0.1000::numeric AS candidate_confidence
    FROM latest_fallback lf
),
ranked AS (
    SELECT
        u.*,
        row_number() OVER (
            PARTITION BY u.source_name, u.security_code
            ORDER BY u.candidate_confidence DESC, u.occurrence_count DESC, u.candidate_security_no
        ) AS rn
    FROM unioned u
),
active_overrides AS (
    SELECT mo.security_code
    FROM ops.bridge_manual_overrides mo
    WHERE mo.is_active = true
)
INSERT INTO ops.bridge_remediation_candidates (
    security_code,
    source_name,
    occurrence_count,
    distinct_accounts,
    distinct_brokers,
    candidate_security_no,
    candidate_reason,
    candidate_confidence
)
SELECT
    security_code,
    source_name,
    occurrence_count,
    distinct_accounts,
    distinct_brokers,
    candidate_security_no,
    candidate_reason,
    candidate_confidence
FROM ranked
WHERE rn = 1
    AND NOT EXISTS (
            SELECT 1
            FROM active_overrides ao
            WHERE ao.security_code = ranked.security_code
    );

COMMIT;
