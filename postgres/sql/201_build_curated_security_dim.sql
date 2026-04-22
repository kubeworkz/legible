BEGIN;

CREATE SCHEMA IF NOT EXISTS curated;

CREATE TABLE IF NOT EXISTS curated.dim_security (
    security_no text NOT NULL,
    symbol text,
    cusip text,
    security_type text,
    security_class text,
    country text,
    funds text,
    english_description text,
    french_description text,
    cad_close_price numeric,
    usd_close_price numeric,
    cad_price_date date,
    usd_price_date date,
    security_origin text,
    quality_tier text,
    curated_at timestamptz
);

TRUNCATE TABLE curated.dim_security;

INSERT INTO curated.dim_security
SELECT
    sr.security_no,
    COALESCE(sr.symbol, 'N/A') AS symbol,
    COALESCE(sr.cusip, 'N/A') AS cusip,
    COALESCE(sr.security_type, 'UNK') AS security_type,
    COALESCE(sr.security_class, 'UNK') AS security_class,
    COALESCE(sr.country, 'UNK') AS country,
    COALESCE(sr.funds, 'UNK') AS funds,
    sr.english_description,
    sr.french_description,
    sr.cad_close_price,
    sr.usd_close_price,
    sr.cad_price_date,
    sr.usd_price_date,
    sr.security_origin,
    CASE
        WHEN sr.security_origin = 'master' THEN 'high'
        WHEN sr.security_origin = 'bridge_fallback' AND sr.security_no = '__UNKNOWN__' THEN 'low'
        WHEN sr.security_origin = 'bridge_fallback' THEN 'medium'
        ELSE 'low'
    END AS quality_tier,
    now() AS curated_at
FROM core.security_registry sr;

CREATE UNIQUE INDEX IF NOT EXISTS uq_curated_dim_security_no
    ON curated.dim_security (security_no);

CREATE INDEX IF NOT EXISTS idx_curated_dim_security_origin
    ON curated.dim_security (security_origin);

COMMIT;
