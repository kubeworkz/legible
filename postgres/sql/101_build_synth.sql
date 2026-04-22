BEGIN;

CREATE SCHEMA IF NOT EXISTS synth;

DO $$
BEGIN
    IF to_regclass('core.security_registry') IS NULL OR to_regclass('core.security_bridge') IS NULL THEN
        RAISE EXCEPTION 'Missing core security bridge artifacts. Run ./ism-data/postgres/scripts/build_security_bridge.sh first.';
    END IF;
END
$$;

DROP TABLE IF EXISTS synth.security_map;
CREATE TABLE synth.security_map AS
SELECT
    security_no AS source_security_no,
    'S' || lpad(row_number() OVER (ORDER BY security_no)::text, 8, '0') AS synthetic_security_no
FROM core.security_registry;

CREATE UNIQUE INDEX IF NOT EXISTS uq_synth_security_map_source
    ON synth.security_map (source_security_no);
CREATE UNIQUE INDEX IF NOT EXISTS uq_synth_security_map_synthetic
    ON synth.security_map (synthetic_security_no);

DROP TABLE IF EXISTS synth.account_map;
CREATE TABLE synth.account_map AS
SELECT
    account_no AS source_account_no,
    'A' || upper(substr(md5(account_no), 1, 10)) AS synthetic_account_no
FROM (
    SELECT DISTINCT account_no FROM core.trades WHERE account_no IS NOT NULL AND btrim(account_no) <> ''
    UNION
    SELECT DISTINCT account_no FROM core.bookings WHERE account_no IS NOT NULL AND btrim(account_no) <> ''
) a;

CREATE UNIQUE INDEX IF NOT EXISTS uq_synth_account_map_source
    ON synth.account_map (source_account_no);

DROP TABLE IF EXISTS synth.broker_map;
CREATE TABLE synth.broker_map AS
SELECT
    broker_no AS source_broker_no,
    'B' || upper(substr(md5(broker_no), 1, 6)) AS synthetic_broker_no
FROM (
    SELECT DISTINCT broker_no FROM core.trades WHERE broker_no IS NOT NULL AND btrim(broker_no) <> ''
    UNION
    SELECT DISTINCT broker_no FROM core.bookings WHERE broker_no IS NOT NULL AND btrim(broker_no) <> ''
) b;

CREATE UNIQUE INDEX IF NOT EXISTS uq_synth_broker_map_source
    ON synth.broker_map (source_broker_no);

DROP TABLE IF EXISTS synth.securities;
CREATE TABLE synth.securities AS
SELECT
    sm.synthetic_security_no AS security_no,
    cs.security_type,
    cs.security_class,
    'SYM_' || right(sm.synthetic_security_no, 6) AS symbol,
    'CUSIP_' || right(sm.synthetic_security_no, 6) AS cusip,
    cs.country,
    'Synthetic Security ' || right(sm.synthetic_security_no, 6) AS english_description,
    'Valeur synthetique ' || right(sm.synthetic_security_no, 6) AS french_description,
    cs.funds,
    CASE
        WHEN cs.cad_close_price IS NULL THEN NULL
        ELSE round(cs.cad_close_price * (1 + ((mod(abs(hashtext(sm.synthetic_security_no)), 2001) - 1000)::numeric / 100000)), 6)
    END AS cad_close_price,
    CASE
        WHEN cs.usd_close_price IS NULL THEN NULL
        ELSE round(cs.usd_close_price * (1 + ((mod(abs(hashtext(sm.synthetic_security_no || '_usd')), 2001) - 1000)::numeric / 100000)), 6)
    END AS usd_close_price,
    cs.cad_price_date,
    cs.usd_price_date,
    cs.security_origin,
    now() AS generated_at
FROM core.security_registry cs
JOIN synth.security_map sm ON sm.source_security_no = cs.security_no;

CREATE UNIQUE INDEX IF NOT EXISTS uq_synth_securities_security_no
    ON synth.securities (security_no);

DROP TABLE IF EXISTS synth.trades;
CREATE TABLE synth.trades AS
SELECT
    bm.synthetic_broker_no AS broker_no,
    am.synthetic_account_no AS account_no,
    'T' || lpad(row_number() OVER (ORDER BY ct.account_no, ct.trade_no, ct.trade_ts)::text, 10, '0') AS trade_no,
    ct.record_type,
    ct.buy_sell,
    ct.cancel_flag,
    sm.synthetic_security_no AS security_no,
    CASE
        WHEN ct.process_ts IS NULL THEN NULL
        ELSE ct.process_ts + make_interval(days => mod(abs(hashtext(coalesce(ct.trade_no, ''))), 30))
    END AS process_ts,
    CASE
        WHEN ct.trade_ts IS NULL THEN NULL
        ELSE ct.trade_ts + make_interval(days => mod(abs(hashtext(coalesce(ct.trade_no, 'T'))), 30))
    END AS trade_ts,
    CASE
        WHEN ct.value_ts IS NULL THEN NULL
        ELSE ct.value_ts + make_interval(days => mod(abs(hashtext(coalesce(ct.trade_no, 'V'))), 30))
    END AS value_ts,
    CASE
        WHEN ct.quantity IS NULL THEN NULL
        ELSE round(ct.quantity * (1 + ((mod(abs(hashtext(coalesce(ct.trade_no, 'Q'))), 2001) - 1000)::numeric / 100000)), 6)
    END AS quantity,
    CASE
        WHEN ct.price IS NULL THEN NULL
        ELSE round(ct.price * (1 + ((mod(abs(hashtext(coalesce(ct.trade_no, 'P'))), 2001) - 1000)::numeric / 100000)), 6)
    END AS price,
    CASE
        WHEN ct.net_amount IS NULL THEN NULL
        ELSE round(ct.net_amount * (1 + ((mod(abs(hashtext(coalesce(ct.trade_no, 'N'))), 2001) - 1000)::numeric / 100000)), 6)
    END AS net_amount,
    ct.net_amount_funds,
    now() AS generated_at
FROM core.trades ct
LEFT JOIN synth.account_map am ON am.source_account_no = ct.account_no
LEFT JOIN synth.broker_map bm ON bm.source_broker_no = ct.broker_no
LEFT JOIN core.security_bridge sb ON sb.security_code = COALESCE(NULLIF(btrim(ct.security_code), ''), '__UNKNOWN__')
LEFT JOIN synth.security_map sm ON sm.source_security_no = sb.mapped_security_no;

CREATE INDEX IF NOT EXISTS idx_synth_trades_account_no ON synth.trades (account_no);
CREATE INDEX IF NOT EXISTS idx_synth_trades_security_no ON synth.trades (security_no);

DROP TABLE IF EXISTS synth.bookings;
CREATE TABLE synth.bookings AS
SELECT
    bm.synthetic_broker_no AS broker_no,
    am.synthetic_account_no AS account_no,
    b.major_type_code,
    'R' || lpad(row_number() OVER (ORDER BY b.account_no, b.txn_ref_id, b.process_date)::text, 10, '0') AS txn_ref_id,
    b.txn_subseq,
    sm.synthetic_security_no AS security_no,
    CASE
        WHEN b.process_date IS NULL THEN NULL
        ELSE b.process_date + make_interval(days => mod(abs(hashtext(coalesce(b.txn_ref_id, 'P'))), 30))
    END AS process_date,
    CASE
        WHEN b.trade_date IS NULL THEN NULL
        ELSE b.trade_date + make_interval(days => mod(abs(hashtext(coalesce(b.txn_ref_id, 'T'))), 30))
    END AS trade_date,
    CASE
        WHEN b.value_date IS NULL THEN NULL
        ELSE b.value_date + make_interval(days => mod(abs(hashtext(coalesce(b.txn_ref_id, 'V'))), 30))
    END AS value_date,
    CASE
        WHEN b.detail_amount IS NULL THEN NULL
        ELSE round(b.detail_amount * (1 + ((mod(abs(hashtext(coalesce(b.txn_ref_id, 'A'))), 2001) - 1000)::numeric / 100000)), 6)
    END AS detail_amount,
    b.detail_amount_funds,
    CASE
        WHEN b.detail_quantity IS NULL THEN NULL
        ELSE round(b.detail_quantity * (1 + ((mod(abs(hashtext(coalesce(b.txn_ref_id, 'Q'))), 2001) - 1000)::numeric / 100000)), 6)
    END AS detail_quantity,
    b.rr_code,
    now() AS generated_at
FROM core.bookings b
LEFT JOIN synth.account_map am ON am.source_account_no = b.account_no
LEFT JOIN synth.broker_map bm ON bm.source_broker_no = b.broker_no
LEFT JOIN core.security_bridge sb ON sb.security_code = COALESCE(NULLIF(btrim(b.security_code), ''), '__UNKNOWN__')
LEFT JOIN synth.security_map sm ON sm.source_security_no = sb.mapped_security_no;

CREATE INDEX IF NOT EXISTS idx_synth_bookings_account_no ON synth.bookings (account_no);
CREATE INDEX IF NOT EXISTS idx_synth_bookings_security_no ON synth.bookings (security_no);

COMMIT;
