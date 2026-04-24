-- 104_build_synth_raw_tables.sql
-- Builds synth-schema equivalents for the raw-format MDL models:
--   SecurityMaster, AccountProfile, ClientProfile, AccountClientLink,
--   AccountAddress, NameAddressMaster, AccountHoldings,
--   AccountHoldingsSummary, TradeCalc
--
-- All tables are derived from existing synth.* data (securities, accounts,
-- clients, client_account_links, trades) so the data is already anonymised.
-- MDL models are updated to point to synth.* instead of raw.*.

BEGIN;

-- ============================================================
-- SECURITY MASTER  (mirrors raw.smdsdrt columns used by MDL)
-- ============================================================
DROP TABLE IF EXISTS synth.security_master;
CREATE TABLE synth.security_master AS
SELECT
    s.security_no                                                           AS secno,
    s.security_type                                                         AS sectype,
    s.security_class                                                        AS secclass,
    s.english_description                                                   AS engsdesc,
    s.french_description                                                    AS frsdesc,
    COALESCE(s.funds, CASE WHEN mod(abs(hashtext(s.security_no)), 3) = 0 THEN 'U' ELSE 'C' END)
                                                                            AS funds,
    -- coupon/dividend pay frequency for income-paying securities
    CASE
        WHEN s.security_type IN ('260','263','310','315') THEN
            (ARRAY['SA','Q','A','M'])[1 + mod(abs(hashtext(s.security_no || 'freq')), 4)]
        ELSE NULL
    END                                                                     AS payfreq,
    -- pay rate for bonds/preferreds
    CASE
        WHEN s.security_type IN ('260','263','310','315') THEN
            to_char((3.0 + mod(abs(hashtext(s.security_no || 'rate')), 500)::numeric / 100.0), 'FM9.999')
        ELSE NULL
    END                                                                     AS payrate,
    NULL::text                                                              AS fraction,
    -- maturity date for bonds (2024-2040 range)
    CASE
        WHEN s.security_type IN ('260','263','310','315') THEN
            to_char(date '2024-01-01' + (mod(abs(hashtext(s.security_no || 'mat')), 5840) || ' days')::interval, 'MM/DD/YY')
        ELSE NULL
    END                                                                     AS expmatdt,
    s.cusip                                                                 AS cusip,
    -- CAD prices: bid/ask/close
    CASE WHEN s.cad_close_price IS NOT NULL
         THEN to_char(s.cad_close_price * 0.998, 'FM9999.9999') END        AS cdnbidpr,
    CASE WHEN s.cad_close_price IS NOT NULL
         THEN to_char(s.cad_close_price * 1.002, 'FM9999.9999') END        AS cdnaskpr,
    CASE WHEN s.cad_close_price IS NOT NULL
         THEN to_char(s.cad_close_price, 'FM9999.9999') END                AS cdnclspr,
    NULL::text                                                              AS cdnprsup,
    to_char(COALESCE(s.cad_price_date, current_date - 1), 'MM/DD/YY')      AS cdnprdt,
    -- USD prices
    CASE WHEN s.usd_close_price IS NOT NULL
         THEN to_char(s.usd_close_price * 0.998, 'FM9999.9999') END        AS usbidpr,
    CASE WHEN s.usd_close_price IS NOT NULL
         THEN to_char(s.usd_close_price * 1.002, 'FM9999.9999') END        AS usaskpr,
    CASE WHEN s.usd_close_price IS NOT NULL
         THEN to_char(s.usd_close_price, 'FM9999.9999') END                AS usclspr,
    NULL::text                                                              AS usprsup,
    to_char(COALESCE(s.usd_price_date, current_date - 1), 'MM/DD/YY')      AS usprdt,
    s.symbol                                                                AS symbol,
    COALESCE(s.country, 'CA')                                               AS country,
    NULL::text                                                              AS cdnclsbidask,
    NULL::text                                                              AS usclsbidask,
    -- indicated annual dividend for equity-type securities
    CASE
        WHEN s.security_type NOT IN ('260','263','310','315')
             AND s.cad_close_price IS NOT NULL THEN
            to_char(s.cad_close_price * (mod(abs(hashtext(s.security_no || 'div')), 300)::numeric / 10000.0), 'FM9.9999')
        ELSE NULL
    END                                                                     AS indanndiv,
    'synth'::text                                                           AS _source_file,
    now()                                                                   AS _loaded_at
FROM synth.securities s;

CREATE UNIQUE INDEX IF NOT EXISTS uq_synth_security_master_secno
    ON synth.security_master (secno);


-- ============================================================
-- ACCOUNT PROFILE  (mirrors raw.apdadrt key columns)
-- Source: synth.accounts + deterministic hash fields
-- ============================================================
DROP TABLE IF EXISTS synth.account_profile;
CREATE TABLE synth.account_profile AS
SELECT
    a.account_no                                                            AS accountno,
    (ARRAY['CA','MA','RS','RF','TF','LI','RR','ES'])
        [1 + mod(abs(hashtext(a.account_no || 'type')), 8)]                AS accounttype,
    (ARRAY['CAD','USD','CAD','CAD','CAD','USD','CAD','CAD'])
        [1 + mod(abs(hashtext(a.account_no || 'fund')), 8)]                AS accountfunds,
    chr(65 + mod(abs(hashtext(a.account_no || 'cls')), 5))                 AS accountclass,
    'RR' || lpad((1 + mod(abs(hashtext(a.account_no || 'rr')), 20))::text, 3, '0') AS rrcode,
    'R' || lpad((mod(abs(hashtext(a.account_no || 'rep')), 90) + 10)::text, 2, '0') AS reportingcode,
    a.account_short_name                                                    AS accountshname,
    a.registration_name                                                     AS regname,
    NULL::text                                                              AS accountsin,
    to_char(date '2000-01-01' + (mod(abs(hashtext(a.account_no || 'init')), 8400) || ' days')::interval, 'YYYYMMDD')
                                                                            AS initialdate,
    to_char(current_date - (mod(abs(hashtext(a.account_no || 'upd')), 730) || ' days')::interval, 'YYYYMMDD')
                                                                            AS lastupdatedate,
    to_char(current_date - (mod(abs(hashtext(a.account_no || 'trd')), 365) || ' days')::interval, 'YYYYMMDD')
                                                                            AS lasttradedate,
    NULL::text                                                              AS closeinstrdate,
    NULL::text                                                              AS closedate,
    '3'                                                                     AS delinstr,
    lpad((mod(abs(hashtext(a.account_no || 'plan')), 9) + 1)::text, 2, '0') AS planningcode,
    'STD'                                                                   AS commissioncode,
    NULL::text                                                              AS commissionrate,
    COALESCE(a.branch_no, lpad((mod(abs(hashtext(a.account_no || 'br')), 99) + 1)::text, 5, '0'))
                                                                            AS branchno,
    'synth'::text                                                           AS _source_file,
    now()                                                                   AS _loaded_at
FROM synth.accounts a;

CREATE UNIQUE INDEX IF NOT EXISTS uq_synth_account_profile_accountno
    ON synth.account_profile (accountno);


-- ============================================================
-- CLIENT PROFILE  (mirrors raw.apdclrt key columns)
-- Source: synth.clients + deterministic KYC hash fields
-- ============================================================
DROP TABLE IF EXISTS synth.client_profile;
CREATE TABLE synth.client_profile AS
SELECT
    c.client_no                                                             AS clientno,
    COALESCE(c.language,
        CASE WHEN mod(abs(hashtext(c.client_no || 'lang')), 5) = 0 THEN 'F' ELSE 'E' END)
                                                                            AS language,
    c.client_no                                                             AS clientshname,
    COALESCE(c.branch, lpad((mod(abs(hashtext(c.client_no || 'br')), 99) + 1)::text, 5, '0'))
                                                                            AS branch,
    COALESCE(c.resident_code, '00')                                         AS residentcode,
    COALESCE(c.non_resident_code, '0')                                      AS nonrescode,
    COALESCE(c.citizenship_code, 'CA')                                      AS citizenshipcode,
    NULL::text                                                              AS telephone,
    -- birth date: 1940-2000 range
    to_char(date '1940-01-01' + (mod(abs(hashtext(c.client_no || 'bday')), 21900) || ' days')::interval, 'YYYYMMDD')
                                                                            AS birthdate,
    NULL::text                                                              AS deceaseddate,
    (ARRAY['01','02','03','04','05','06','07','08','09','10'])
        [1 + mod(abs(hashtext(c.client_no || 'occ')), 10)]                 AS occupation,
    (ARRAY['S','M','D','W','C'])
        [1 + mod(abs(hashtext(c.client_no || 'mar')), 5)]                  AS maritalstatus,
    NULL::text                                                              AS spousename,
    NULL::text                                                              AS spousebirthdate,
    NULL::text                                                              AS sin,
    NULL::text                                                              AS otherid,
    -- net worth band 1 (lowest) to 5 (highest)
    (ARRAY['1','2','3','4','5'])
        [1 + mod(abs(hashtext(c.client_no || 'nw')), 5)]                   AS networth,
    -- investment objectives
    (ARRAY['IN','GR','SP','GI','CA'])
        [1 + mod(abs(hashtext(c.client_no || 'obj1')), 5)]                 AS investobj1,
    (ARRAY['GR','IN','SP','GI','CA'])
        [1 + mod(abs(hashtext(c.client_no || 'obj2')), 5)]                 AS investobj2,
    NULL::text                                                              AS investobj3,
    (ARRAY['N','L','M','H','X'])
        [1 + mod(abs(hashtext(c.client_no || 'iknow')), 5)]                AS investknowledge,
    NULL::text                                                              AS investexper,
    -- risk tolerance
    (ARRAY['LOW','MED','HIGH','SPEC'])
        [1 + mod(abs(hashtext(c.client_no || 'risk')), 4)]                 AS risktolerance,
    NULL::text                                                              AS employer,
    (ARRAY['Y','N','N','N','N'])
        [1 + mod(abs(hashtext(c.client_no || 'disc')), 5)]                 AS discretauth,
    NULL::text                                                              AS dateknowtorr,
    NULL::text                                                              AS rrinterest,
    NULL::text                                                              AS introrrcode,
    'synth'::text                                                           AS _source_file,
    now()                                                                   AS _loaded_at
FROM synth.clients c;

CREATE UNIQUE INDEX IF NOT EXISTS uq_synth_client_profile_clientno
    ON synth.client_profile (clientno);


-- ============================================================
-- ACCOUNT CLIENT LINK  (mirrors raw.apdclct columns)
-- Source: synth.client_account_links
-- ============================================================
DROP TABLE IF EXISTS synth.account_client_link;
CREATE TABLE synth.account_client_link AS
SELECT
    cal.account_no                                                          AS accountno,
    cal.client_no                                                           AS clientno,
    COALESCE(cal.relation_type, 'PRIMARY')                                  AS relationtype,
    to_char(date '2000-01-01' + (mod(abs(hashtext(cal.account_no || 'rs')), 8400) || ' days')::interval, 'YYYYMMDD')
                                                                            AS relnsetupdate,
    'Y'                                                                     AS clientaddruse,
    NULL::text                                                              AS rrcode,
    to_char(date '2000-01-01' + (mod(abs(hashtext(cal.account_no || 'rstart')), 8400) || ' days')::interval, 'YYYYMMDD')
                                                                            AS relnstartdate,
    'synth'::text                                                           AS _source_file,
    now()                                                                   AS _loaded_at
FROM synth.client_account_links cal;

CREATE INDEX IF NOT EXISTS idx_synth_account_client_link_accountno
    ON synth.account_client_link (accountno);
CREATE INDEX IF NOT EXISTS idx_synth_account_client_link_clientno
    ON synth.account_client_link (clientno);


-- ============================================================
-- ACCOUNT ADDRESS  (mirrors raw.apdadaa key columns)
-- Source: synth.accounts — one MAIL-type address per account
-- ============================================================
DROP TABLE IF EXISTS synth.account_address;
CREATE TABLE synth.account_address AS
WITH city_prov(city, prov, cp_idx) AS (
    VALUES
        ('Toronto',     'ON', 1),
        ('Montreal',    'QC', 2),
        ('Vancouver',   'BC', 3),
        ('Calgary',     'AB', 4),
        ('Ottawa',      'ON', 5),
        ('Edmonton',    'AB', 6),
        ('Winnipeg',    'MB', 7),
        ('Halifax',     'NS', 8),
        ('Quebec City', 'QC', 9),
        ('Victoria',    'BC', 10)
),
street_names(sname, s_idx) AS (
    VALUES
        ('Main St',           1),
        ('King St',           2),
        ('Queen St',          3),
        ('Bay St',            4),
        ('Yonge St',          5),
        ('Rue Saint-Denis',   6),
        ('Granville St',      7),
        ('Centre St',         8),
        ('Portage Ave',       9),
        ('Barrington St',     10)
)
SELECT
    a.account_no                                                            AS accountno,
    'MAIL'                                                                  AS addresstype,
    -- civic number + street
    (mod(abs(hashtext(a.account_no || 'stn')), 9999) + 1)::text || ' ' ||
        (SELECT sname FROM street_names WHERE s_idx = 1 + mod(abs(hashtext(a.account_no || 'str')), 10))
                                                                            AS naline1,
    NULL::text                                                              AS naline2,
    -- city province line
    (SELECT city FROM city_prov WHERE cp_idx = 1 + mod(abs(hashtext(a.account_no || 'city')), 10)) ||
        ' ' ||
    (SELECT prov FROM city_prov WHERE cp_idx = 1 + mod(abs(hashtext(a.account_no || 'city')), 10))
                                                                            AS naline3,
    'Canada'                                                                AS naline4,
    NULL::text                                                              AS naline5,
    NULL::text                                                              AS naline6,
    NULL::text                                                              AS naline7,
    NULL::text                                                              AS naline8,
    -- Canadian postal code format: A1A 1A1
    chr(65 + mod(abs(hashtext(a.account_no || 'pc1')), 26)) ||
        (mod(abs(hashtext(a.account_no || 'pc2')), 9) + 1)::text ||
        chr(65 + mod(abs(hashtext(a.account_no || 'pc3')), 26)) || ' ' ||
        (mod(abs(hashtext(a.account_no || 'pc4')), 9) + 1)::text ||
        chr(65 + mod(abs(hashtext(a.account_no || 'pc5')), 26)) ||
        (mod(abs(hashtext(a.account_no || 'pc6')), 9) + 1)::text           AS postalcode,
    (ARRAY['1','2','3','4'])
        [1 + mod(abs(hashtext(a.account_no || 'conf')), 4)]                AS confirmtype,
    '0'                                                                     AS noextraconf,
    'Y'                                                                     AS getstmt1,
    NULL::text                                                              AS getstmt2,
    NULL::text                                                              AS suppressmsg1,
    NULL::text                                                              AS suppressmsg2,
    NULL::text                                                              AS prt8nalines1,
    NULL::text                                                              AS prt8nalines2,
    NULL::text                                                              AS holdmail1,
    NULL::text                                                              AS holdmail2,
    NULL::text                                                              AS suppressprice1,
    NULL::text                                                              AS suppressprice2,
    NULL::text                                                              AS noextrastmt1,
    NULL::text                                                              AS noextrastmt2,
    'synth'::text                                                           AS _source_file,
    now()                                                                   AS _loaded_at
FROM synth.accounts a;

CREATE INDEX IF NOT EXISTS idx_synth_account_address_accountno
    ON synth.account_address (accountno);


-- ============================================================
-- NAME ADDRESS MASTER  (mirrors raw.nam key columns)
-- Source: synth.accounts + synth.account_profile
-- ============================================================
DROP TABLE IF EXISTS synth.name_address_master;
CREATE TABLE synth.name_address_master AS
SELECT
    a.account_no                                                            AS acct,
    ap.rrcode,
    ap.branchno                                                             AS rrbranchcode,
    ap.accounttype                                                          AS type,
    ap.accountfunds                                                         AS funds,
    NULL::text                                                              AS rrcode2,
    a.registration_name                                                     AS name,
    CASE WHEN mod(abs(hashtext(a.account_no || 'lang')), 5) = 0 THEN 'F' ELSE 'E' END
                                                                            AS lang_ind,
    '3'                                                                     AS delivery,
    '1'                                                                     AS div_conf,
    NULL::text                                                              AS int_dr,
    NULL::text                                                              AS int_cr,
    '00'                                                                    AS residenc,
    '0'                                                                     AS non_res,
    ap.accountclass                                                         AS class,
    NULL::text                                                              AS spec_tax,
    NULL::text                                                              AS coll_chg,
    NULL::text                                                              AS cr_rate,
    NULL::text                                                              AS opt_code,
    NULL::text                                                              AS port_cap,
    NULL::text                                                              AS port_evl,
    NULL::text                                                              AS gg_code,
    NULL::text                                                              AS st_hold,
    NULL::text                                                              AS gg_acct,
    NULL::text                                                              AS pay_code,
    NULL::text                                                              AS reg_code,
    NULL::text                                                              AS mailcode,
    NULL::text                                                              AS soc_ins,
    to_char(current_date - (mod(abs(hashtext(a.account_no || 'nupd')), 730) || ' days')::interval, 'MMDDYYYY')
                                                                            AS upd_datestr,
    ap.initialdate                                                          AS act_datestr
FROM synth.accounts a
LEFT JOIN synth.account_profile ap ON ap.accountno = a.account_no;

CREATE UNIQUE INDEX IF NOT EXISTS uq_synth_name_address_master_acct
    ON synth.name_address_master (acct);


-- ============================================================
-- ACCOUNT HOLDINGS  (mirrors raw.das4 columns)
-- Generates 3–7 holdings per account using deterministic selection.
-- Each account-slot picks a security by hashed offset into the
-- numbered securities list; DISTINCT ON removes rare collisions.
-- ============================================================
DROP TABLE IF EXISTS synth.account_holdings;
CREATE TABLE synth.account_holdings AS
WITH sec_count AS (
    SELECT count(*) AS n FROM synth.securities
         WHERE cad_close_price IS NOT NULL OR usd_close_price IS NOT NULL
),
sec_numbered AS (
    SELECT
        security_no,
        security_type,
        funds AS sec_funds,
        english_description,
        COALESCE(cad_close_price, usd_close_price, 10.0) AS mktprice,
        CASE security_type
            WHEN '260' THEN 'BD'
            WHEN '263' THEN 'BD'
            WHEN '310' THEN 'BD'
            WHEN '315' THEN 'BD'
            WHEN '380' THEN 'EQ'
            WHEN '330' THEN 'EQ'
            WHEN '220' THEN 'MM'
            WHEN '230' THEN 'MF'
            ELSE 'OT'
        END AS groupcode,
        (row_number() OVER (ORDER BY security_no) - 1) AS idx
    FROM synth.securities
    WHERE cad_close_price IS NOT NULL OR usd_close_price IS NOT NULL
),
acct_slots AS (
    SELECT
        a.account_no,
        ap.accountfunds,
        gs.slot
    FROM synth.accounts a
    JOIN synth.account_profile ap ON ap.accountno = a.account_no
    CROSS JOIN generate_series(0, 6) gs(slot)
    -- each account gets 3 + (hash mod 5) = 3–7 slots
    WHERE gs.slot < 3 + mod(abs(hashtext(a.account_no || 'nhld')), 5)
),
raw_holdings AS (
    SELECT DISTINCT ON (acct_slots.account_no, sn.security_no)
        acct_slots.account_no,
        acct_slots.accountfunds,
        acct_slots.slot,
        sn.security_no,
        sn.sec_funds,
        sn.english_description,
        sn.mktprice,
        sn.groupcode,
        -- quantity: 100–50000 units, rounded to nearest 100 for bonds
        CASE sn.groupcode
            WHEN 'BD' THEN
                ((100 + mod(abs(hashtext(acct_slots.account_no || sn.security_no || 'qty')), 499)) * 1000)::numeric
            ELSE
                (100 + mod(abs(hashtext(acct_slots.account_no || sn.security_no || 'qty')), 49901))::numeric
        END AS currqty,
        -- small price perturbation per account (± 0.5%)
        sn.mktprice * (1 + (mod(abs(hashtext(acct_slots.account_no || sn.security_no || 'pr')), 201) - 100)::numeric / 20000.0)
            AS adj_price
    FROM acct_slots
    JOIN sec_numbered sn
        ON sn.idx = mod(
            abs(hashtext(acct_slots.account_no)) + acct_slots.slot * 761,
            (SELECT n FROM sec_count)::bigint
        )
    ORDER BY acct_slots.account_no, sn.security_no
)
SELECT
    account_no                                                              AS acctno,
    security_no                                                             AS secnum,
    english_description                                                     AS secdesc,
    groupcode,
    COALESCE(accountfunds, sec_funds, 'C')                                  AS funds,
    to_char(current_date - (mod(abs(hashtext(account_no || security_no || 'ltd')), 365) || ' days')::interval, 'YYYYMMDD')
                                                                            AS lasttradedatestr,
    currqty,
    0::numeric                                                              AS sfkqty,
    0::numeric                                                              AS pendqty,
    0::numeric                                                              AS memoqty,
    round(adj_price, 4)                                                     AS mktprice,
    NULL::text                                                              AS loanrate,
    round(currqty * adj_price, 4)                                           AS mktvalue,
    -- loan value: 95% for bonds, 70% for equities, 100% for money market
    round(currqty * adj_price *
        CASE groupcode
            WHEN 'BD' THEN 0.95
            WHEN 'EQ' THEN 0.70
            WHEN 'MM' THEN 1.00
            ELSE 0.50
        END, 4)                                                             AS loanvalue,
    NULL::text                                                              AS optcovercode,
    NULL::text                                                              AS undseccode,
    NULL::text                                                              AS undsecprice,
    (current_date - (mod(abs(hashtext(account_no || security_no || 'ltd')), 365) || ' days')::interval)::date
                                                                            AS lasttradedate,
    'synth'::text                                                           AS _source_file,
    now()                                                                   AS _loaded_at
FROM raw_holdings;

CREATE INDEX IF NOT EXISTS idx_synth_account_holdings_acctno
    ON synth.account_holdings (acctno);
CREATE INDEX IF NOT EXISTS idx_synth_account_holdings_secnum
    ON synth.account_holdings (secnum);


-- ============================================================
-- ACCOUNT HOLDINGS SUMMARY  (mirrors raw.dasc1 key columns)
-- Aggregated from synth.account_holdings per account
-- ============================================================
DROP TABLE IF EXISTS synth.account_holdings_summary;
CREATE TABLE synth.account_holdings_summary AS
SELECT
    h.acctno,
    ap.accounttype                                                          AS accttype,
    ap.accountfunds                                                         AS funds,
    ap.rrcode                                                               AS rrcode2,
    ap.branchno                                                             AS rrbranch,
    ap.accountclass                                                         AS acctclass,
    CASE WHEN mod(abs(hashtext(h.acctno || 'lang')), 5) = 0 THEN 'F' ELSE 'E' END
                                                                            AS language,
    round(sum(h.mktvalue), 2)                                               AS tdmktval,
    round(sum(h.mktvalue) - lag(sum(h.mktvalue), 1, sum(h.mktvalue))
          OVER (PARTITION BY h.acctno ORDER BY h.acctno), 2)               AS mebknetchg,
    round(sum(h.mktvalue) * 0.02, 2)                                        AS tdbalunsc,
    round(sum(h.mktvalue) - sum(h.loanvalue), 2)                            AS sdbal,
    round(sum(h.mktvalue) * 0.30, 2)                                        AS tdreqmrg,
    round(sum(h.loanvalue), 2)                                              AS tdreqsecure,
    'A'                                                                     AS curstat,
    '0'                                                                     AS curdelinq
FROM synth.account_holdings h
LEFT JOIN synth.account_profile ap ON ap.accountno = h.acctno
GROUP BY h.acctno, ap.accounttype, ap.accountfunds, ap.rrcode, ap.branchno, ap.accountclass;

CREATE UNIQUE INDEX IF NOT EXISTS uq_synth_account_holdings_summary_acctno
    ON synth.account_holdings_summary (acctno);


-- ============================================================
-- TRADE CALC  (mirrors raw.calc key columns)
-- Source: synth.trades — maps existing trade records to calc format
-- ============================================================
DROP TABLE IF EXISTS synth.trade_calc;
CREATE TABLE synth.trade_calc AS
SELECT
    t.broker_no                                                             AS bkr,
    NULL::text                                                              AS acctbranch,
    t.account_no                                                            AS acctno,
    to_char(t.process_ts, 'MM/DD/YY HH24:MI:SS')                           AS procdate,
    COALESCE(t.record_type, 'TR')                                           AS recordtype,
    t.trade_no                                                              AS tradeno,
    t.buy_sell::text                                                        AS buysell,
    t.cancel_flag::text                                                     AS cancel,
    t.security_no                                                           AS seccode,
    to_char(t.value_ts, 'MM/DD/YY HH24:MI:SS')                             AS valuedate,
    to_char(t.trade_ts, 'MM/DD/YY HH24:MI:SS')                             AS tradedate,
    t.quantity::text                                                        AS qty,
    NULL::text                                                              AS qtydbsignrev,
    NULL::text                                                              AS netpref,
    NULL::text                                                              AS netoflo,
    t.net_amount::text                                                      AS netamt,
    t.net_amount_funds                                                      AS netamtfunds,
    t.quantity::text                                                        AS totqty,
    t.price::text                                                           AS avgprice,
    t.price::text                                                           AS price,
    t.net_amount_funds                                                      AS pricefunds,
    NULL::text                                                              AS mktcode,
    '5'                                                                     AS tradebasis,
    NULL::text                                                              AS rrcode,
    'synth'::text                                                           AS _source_file,
    now()                                                                   AS _loaded_at
FROM synth.trades t;

CREATE INDEX IF NOT EXISTS idx_synth_trade_calc_acctno
    ON synth.trade_calc (acctno);
CREATE INDEX IF NOT EXISTS idx_synth_trade_calc_tradeno
    ON synth.trade_calc (tradeno);

COMMIT;
