BEGIN;

CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS ops;

CREATE TABLE IF NOT EXISTS ops.bridge_manual_overrides (
    security_code text PRIMARY KEY,
    mapped_security_no text NOT NULL,
    override_reason text NOT NULL,
    approved_by text,
    source_candidate_id bigint,
    approved_at timestamptz NOT NULL DEFAULT now(),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TABLE IF EXISTS core.security_bridge;
CREATE TABLE core.security_bridge AS
WITH code_space AS (
    SELECT DISTINCT security_code
    FROM (
        SELECT btrim(security_code) AS security_code FROM core.trades
        UNION ALL
        SELECT btrim(security_code) AS security_code FROM core.bookings
        UNION ALL
        SELECT '__UNKNOWN__' AS security_code
    ) c
    WHERE security_code IS NOT NULL AND security_code <> ''
),
master_security AS (
    SELECT security_no FROM core.securities
),
master_cusip AS (
    SELECT
        security_no,
        regexp_replace(btrim(cusip), '[^0-9A-Za-z]', '', 'g') AS cusip_norm
    FROM core.securities
    WHERE cusip IS NOT NULL AND btrim(cusip) <> ''
),
calc_code_to_cusip AS (
    SELECT
        btrim(seccode) AS security_code,
        regexp_replace(btrim(dcscusip), '[^0-9A-Za-z]', '', 'g') AS cusip_norm
    FROM raw.calc
    WHERE btrim(seccode) <> ''
      AND btrim(dcscusip) <> ''
),
cusip_to_master AS (
    SELECT
        c.security_code,
        min(m.security_no) AS master_security_no,
        count(DISTINCT m.security_no) AS master_matches
    FROM calc_code_to_cusip c
    JOIN master_cusip m ON m.cusip_norm = c.cusip_norm
    GROUP BY c.security_code
),
resolved AS (
    SELECT
        cs.security_code,
        o.mapped_security_no AS override_security_no,
        o.override_reason,
        ms.security_no AS direct_security_no,
        CASE
            WHEN ctm.master_matches = 1 THEN ctm.master_security_no
            ELSE NULL
        END AS cusip_mapped_security_no
    FROM code_space cs
    LEFT JOIN ops.bridge_manual_overrides o
        ON o.security_code = cs.security_code
       AND o.is_active = true
    LEFT JOIN master_security ms ON ms.security_no = cs.security_code
    LEFT JOIN cusip_to_master ctm ON ctm.security_code = cs.security_code
)
SELECT
    security_code,
    COALESCE(override_security_no, direct_security_no, cusip_mapped_security_no, security_code) AS mapped_security_no,
    CASE
        WHEN override_security_no IS NOT NULL THEN 'manual_override'
        WHEN direct_security_no IS NOT NULL THEN 'direct_master_security_no'
        WHEN cusip_mapped_security_no IS NOT NULL THEN 'calc_dcscusip_to_master_cusip'
        ELSE 'fallback_self_code'
    END AS mapping_rule,
    CASE
        WHEN override_security_no IS NOT NULL THEN 1.0
        WHEN direct_security_no IS NOT NULL THEN 1.0
        WHEN cusip_mapped_security_no IS NOT NULL THEN 0.9
        ELSE 0.5
    END AS mapping_confidence,
    now() AS bridged_at
FROM resolved;

CREATE UNIQUE INDEX IF NOT EXISTS uq_core_security_bridge_code
    ON core.security_bridge (security_code);
CREATE INDEX IF NOT EXISTS idx_core_security_bridge_mapped
    ON core.security_bridge (mapped_security_no);

DROP TABLE IF EXISTS core.security_registry;
CREATE TABLE core.security_registry AS
SELECT
    s.security_no,
    s.security_type,
    s.security_class,
    s.symbol,
    s.cusip,
    s.country,
    s.english_description,
    s.french_description,
    s.funds,
    s.cad_close_price,
    s.usd_close_price,
    s.cad_price_date,
    s.usd_price_date,
    'master'::text AS security_origin,
    now() AS registry_built_at
FROM core.securities s
UNION ALL
SELECT
    b.mapped_security_no AS security_no,
    NULL::text AS security_type,
    NULL::text AS security_class,
    NULL::text AS symbol,
    NULL::text AS cusip,
    NULL::text AS country,
    'Inferred security for code ' || b.mapped_security_no AS english_description,
    NULL::text AS french_description,
    NULL::text AS funds,
    NULL::numeric AS cad_close_price,
    NULL::numeric AS usd_close_price,
    NULL::date AS cad_price_date,
    NULL::date AS usd_price_date,
    'bridge_fallback'::text AS security_origin,
    now() AS registry_built_at
FROM core.security_bridge b
LEFT JOIN core.securities s ON s.security_no = b.mapped_security_no
WHERE s.security_no IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_core_security_registry_no
    ON core.security_registry (security_no);

CREATE TABLE IF NOT EXISTS ops.security_bridge_snapshot (
    id bigserial PRIMARY KEY,
    measured_at timestamptz NOT NULL DEFAULT now(),
    bridge_rows bigint NOT NULL,
    direct_master_rows bigint NOT NULL,
    cusip_bridge_rows bigint NOT NULL,
    fallback_rows bigint NOT NULL,
    trade_codes_covered bigint NOT NULL,
    booking_codes_covered bigint NOT NULL
);

INSERT INTO ops.security_bridge_snapshot (
    bridge_rows,
    direct_master_rows,
    cusip_bridge_rows,
    fallback_rows,
    trade_codes_covered,
    booking_codes_covered
)
SELECT
    (SELECT count(*) FROM core.security_bridge),
    (SELECT count(*) FROM core.security_bridge WHERE mapping_rule = 'direct_master_security_no'),
    (SELECT count(*) FROM core.security_bridge WHERE mapping_rule = 'calc_dcscusip_to_master_cusip'),
    (SELECT count(*) FROM core.security_bridge WHERE mapping_rule = 'fallback_self_code'),
    (SELECT count(*) FROM (
        SELECT DISTINCT t.security_code
        FROM core.trades t
        JOIN core.security_bridge b ON b.security_code = t.security_code
        WHERE t.security_code IS NOT NULL AND btrim(t.security_code) <> ''
    ) x),
    (SELECT count(*) FROM (
        SELECT DISTINCT k.security_code
        FROM core.bookings k
        JOIN core.security_bridge b ON b.security_code = k.security_code
        WHERE k.security_code IS NOT NULL AND btrim(k.security_code) <> ''
    ) x);

COMMIT;
