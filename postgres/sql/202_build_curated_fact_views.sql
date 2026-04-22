BEGIN;

CREATE SCHEMA IF NOT EXISTS curated;

DROP VIEW IF EXISTS curated.fact_trades;
CREATE VIEW curated.fact_trades AS
SELECT
    t.trade_no,
    t.broker_no,
    t.account_no,
    l.client_no,
    t.security_no,
    ds.symbol AS security_symbol,
    ds.cusip AS security_cusip,
    ds.security_type,
    ds.security_class,
    ds.security_origin,
    ds.quality_tier AS security_quality_tier,
    t.record_type,
    t.buy_sell,
    t.cancel_flag,
    t.process_ts,
    t.trade_ts,
    t.value_ts,
    t.quantity,
    t.price,
    t.net_amount,
    t.net_amount_funds,
    a.account_origin,
    c.client_origin,
    t.generated_at
FROM synth.trades t
LEFT JOIN curated.dim_security ds ON ds.security_no = t.security_no
LEFT JOIN synth.client_account_links l ON l.account_no = t.account_no
LEFT JOIN synth.accounts a ON a.account_no = t.account_no
LEFT JOIN synth.clients c ON c.client_no = l.client_no;

DROP VIEW IF EXISTS curated.fact_bookings;
CREATE VIEW curated.fact_bookings AS
SELECT
    b.txn_ref_id,
    b.broker_no,
    b.account_no,
    l.client_no,
    b.security_no,
    ds.symbol AS security_symbol,
    ds.cusip AS security_cusip,
    ds.security_type,
    ds.security_class,
    ds.security_origin,
    ds.quality_tier AS security_quality_tier,
    b.major_type_code,
    b.txn_subseq,
    b.process_date,
    b.trade_date,
    b.value_date,
    b.detail_amount,
    b.detail_amount_funds,
    b.detail_quantity,
    b.rr_code,
    a.account_origin,
    c.client_origin,
    b.generated_at
FROM synth.bookings b
LEFT JOIN curated.dim_security ds ON ds.security_no = b.security_no
LEFT JOIN synth.client_account_links l ON l.account_no = b.account_no
LEFT JOIN synth.accounts a ON a.account_no = b.account_no
LEFT JOIN synth.clients c ON c.client_no = l.client_no;

COMMIT;
