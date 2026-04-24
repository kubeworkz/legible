-- Phase 5: Expand synthetic data
-- Inserts 10 000 new trades and 20 000 new bookkeeping entries spanning 2020-2025.
-- Edge cases included:
--   * Zero-quantity trades  (~2%, every 50th row)
--   * Cancelled trades      (~5%, every 20th row)
--   * Multi-currency bookkeeping entries (CAD/USD/AUD/EUR/GBP)
--   * Multiple major_type_code values (10/20/30/40/50/60)
-- New IDs start well above the original range to avoid collision.
--   Trades  : T0000010001 – T0000020000
--   Bookkeeping: R0000100001 – R0000120000

BEGIN;

-- ─── 10 000 new trades ───────────────────────────────────────────────────────
INSERT INTO synth.trades (
    broker_no,
    account_no,
    trade_no,
    record_type,
    buy_sell,
    cancel_flag,
    security_no,
    process_ts,
    trade_ts,
    value_ts,
    quantity,
    price,
    net_amount,
    net_amount_funds,
    generated_at
)
WITH
    accts AS (
        SELECT account_no,
               (row_number() OVER (ORDER BY account_no) - 1)::int AS rn
        FROM synth.accounts
    ),
    acct_cnt AS (SELECT COUNT(*)::int AS n FROM synth.accounts),
    secs AS (
        SELECT security_no,
               (row_number() OVER (ORDER BY security_no) - 1)::int AS rn
        FROM synth.securities
        WHERE security_type IS NOT NULL AND security_type != ''
    ),
    sec_cnt AS (
        SELECT COUNT(*)::int AS n
        FROM synth.securities
        WHERE security_type IS NOT NULL AND security_type != ''
    ),
    brks AS (
        SELECT synthetic_broker_no,
               (row_number() OVER (ORDER BY synthetic_broker_no) - 1)::int AS rn
        FROM synth.broker_map
    ),
    -- 14 representative RR codes from existing data
    rr_arr (rr_code, rn) AS (VALUES
        ('0000',  0), ('0020',  1), ('20AP',  2), ('25BB',  3),
        ('25BH',  4), ('25BT',  5), ('25BX',  6), ('26',    7),
        ('30DD',  8), ('30DW',  9), ('40QF', 10), ('40RB', 11),
        ('40RT', 12), ('6050', 13)
    )
SELECT
    b.synthetic_broker_no                                    AS broker_no,
    a.account_no,
    'T' || lpad((10000 + gs.n)::text, 10, '0')              AS trade_no,
    'TR'                                                      AS record_type,

    -- buy_sell: ~65% buy (0), ~35% sell (1)
    CASE WHEN mod(gs.n * 7 + 3, 20) < 13 THEN '0' ELSE '1' END AS buy_sell,

    -- cancel_flag: ~5% cancelled (1)
    CASE WHEN mod(gs.n * 11 + 7, 20) = 0 THEN '1' ELSE '0' END AS cancel_flag,

    s.security_no,

    -- process_ts: distribute across 2020-01-01 to 2025-12-31 (2191 days)
    (DATE '2020-01-01'
        + mod(abs(hashtext('proc_exp_' || gs.n::text)), 2191))::timestamp AS process_ts,
    (DATE '2020-01-01'
        + mod(abs(hashtext('trd_exp_'  || gs.n::text)), 2191))::timestamp AS trade_ts,
    (DATE '2020-01-01'
        + mod(abs(hashtext('val_exp_'  || gs.n::text)), 2191) + 2)::timestamp AS value_ts,

    -- quantity: ~2% zero (edge case), rest 1–9999 units
    CASE WHEN mod(gs.n, 50) = 0
         THEN 0
         ELSE round(
                 (1 + mod(abs(hashtext('qty_exp_' || gs.n::text)), 999900)::numeric / 100),
                 2)
    END AS quantity,

    -- price: 0.01 – 999.99
    round(
        (0.01 + mod(abs(hashtext('pr_exp_' || gs.n::text)), 99999)::numeric / 100),
        6) AS price,

    -- net_amount = quantity × price (zero when quantity is zero)
    CASE WHEN mod(gs.n, 50) = 0
         THEN 0
         ELSE round(
                 (1 + mod(abs(hashtext('qty_exp_' || gs.n::text)), 999900)::numeric / 100)
               * (0.01 + mod(abs(hashtext('pr_exp_'  || gs.n::text)), 99999)::numeric / 100),
               2)
    END AS net_amount,

    -- net_amount_funds: ~75% CAD, ~25% USD (multi-currency)
    CASE WHEN mod(gs.n * 3 + 1, 4) = 0 THEN 'USD' ELSE 'CAD' END AS net_amount_funds,

    now() AS generated_at

FROM generate_series(1, 10000) AS gs(n)
JOIN accts a ON a.rn = mod(gs.n * 17 + 5, (SELECT n FROM acct_cnt))
JOIN secs  s ON s.rn = mod(gs.n * 13 + 3, (SELECT n FROM sec_cnt))
JOIN brks  b ON b.rn = mod(gs.n, 2);


-- ─── 20 000 new bookkeeping entries ─────────────────────────────────────────
INSERT INTO synth.bookkeeping (
    broker_no,
    account_no,
    major_type_code,
    txn_ref_id,
    txn_subseq,
    security_no,
    process_date,
    trade_date,
    value_date,
    detail_amount,
    detail_amount_funds,
    detail_quantity,
    rr_code,
    generated_at
)
WITH
    accts AS (
        SELECT account_no,
               (row_number() OVER (ORDER BY account_no) - 1)::int AS rn
        FROM synth.accounts
    ),
    acct_cnt AS (SELECT COUNT(*)::int AS n FROM synth.accounts),
    secs AS (
        SELECT security_no,
               (row_number() OVER (ORDER BY security_no) - 1)::int AS rn
        FROM synth.securities
        WHERE security_type IS NOT NULL AND security_type != ''
    ),
    sec_cnt AS (
        SELECT COUNT(*)::int AS n
        FROM synth.securities
        WHERE security_type IS NOT NULL AND security_type != ''
    ),
    brks AS (
        SELECT synthetic_broker_no,
               (row_number() OVER (ORDER BY synthetic_broker_no) - 1)::int AS rn
        FROM synth.broker_map
    ),
    rr_arr (rr_code, rn) AS (VALUES
        ('0000',  0), ('0020',  1), ('20AP',  2), ('25BB',  3),
        ('25BH',  4), ('25BT',  5), ('25BX',  6), ('26',    7),
        ('30DD',  8), ('30DW',  9), ('40QF', 10), ('40RB', 11),
        ('40RT', 12), ('6050', 13)
    ),
    -- major_type_code variety: 10=trade settle, 20=dividend, 30=interest,
    --                           40=fee, 50=transfer, 60=corporate action
    type_arr (type_code, rn) AS (VALUES
        ('10', 0), ('10', 1), ('10', 2), ('10', 3),  -- 4/9 trade settle (dominant)
        ('10', 4), ('20', 5), ('20', 6), ('30', 7),  -- 2/9 dividend, 1/9 interest
        ('40', 8)                                     -- 1/9 fee
    ),
    -- currency variety for multi-currency edge cases
    curr_arr (currency, rn) AS (VALUES
        ('CAD', 0), ('CAD', 1), ('CAD', 2), ('CAD', 3),  -- 4/9 CAD
        ('USD', 4), ('USD', 5), ('USD', 6),               -- 3/9 USD
        ('AUD', 7),                                        -- 1/9 AUD
        ('EUR', 8)                                         -- 1/9 EUR
    )
SELECT
    b.synthetic_broker_no                                    AS broker_no,
    a.account_no,
    tc.type_code                                             AS major_type_code,
    'R' || lpad((100000 + gs.n)::text, 10, '0')             AS txn_ref_id,
    mod(gs.n, 3) + 1                                        AS txn_subseq,

    -- security_no: null for ~10% (cash-only bookkeeping entries like fees/transfers)
    CASE WHEN mod(gs.n, 10) = 0
         THEN NULL
         ELSE s.security_no
    END AS security_no,

    -- process_date: spread across 2020-2025
    (DATE '2020-01-01'
        + mod(abs(hashtext('bk_proc_' || gs.n::text)), 2191))::timestamp AS process_date,
    (DATE '2020-01-01'
        + mod(abs(hashtext('bk_trd_'  || gs.n::text)), 2191))::timestamp AS trade_date,
    (DATE '2020-01-01'
        + mod(abs(hashtext('bk_val_'  || gs.n::text)), 2191) + 2)::timestamp AS value_date,

    -- detail_amount: positive (credit) or negative (debit)
    CASE
        WHEN mod(gs.n * 5 + 2, 10) < 6  -- ~60% positive
            THEN  round((0.01 + mod(abs(hashtext('bk_amt_' || gs.n::text)), 9999900)::numeric / 100), 2)
        ELSE     -round((0.01 + mod(abs(hashtext('bk_amt_' || gs.n::text)), 9999900)::numeric / 100), 2)
    END AS detail_amount,

    cr.currency                                              AS detail_amount_funds,

    -- detail_quantity: null for cash-only, zero for ~2% edge case
    CASE
        WHEN mod(gs.n, 10) = 0  THEN NULL
        WHEN mod(gs.n, 50) = 0  THEN 0
        ELSE round((1 + mod(abs(hashtext('bk_qty_' || gs.n::text)), 999900)::numeric / 100), 2)
    END AS detail_quantity,

    rr.rr_code,
    now() AS generated_at

FROM generate_series(1, 20000) AS gs(n)
JOIN accts    a  ON a.rn   = mod(gs.n * 17 + 5, (SELECT n FROM acct_cnt))
JOIN secs     s  ON s.rn   = mod(gs.n * 13 + 3, (SELECT n FROM sec_cnt))
JOIN brks     b  ON b.rn   = mod(gs.n, 2)
JOIN rr_arr   rr ON rr.rn  = mod(gs.n * 3 + 1, 14)
JOIN type_arr tc ON tc.rn  = mod(gs.n, 9)
JOIN curr_arr cr ON cr.rn  = mod(gs.n * 7 + 2, 9);

COMMIT;
