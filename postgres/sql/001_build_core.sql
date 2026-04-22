BEGIN;

CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS ops;

CREATE OR REPLACE FUNCTION ops.try_parse_yyyymmdd(v text)
RETURNS date
LANGUAGE sql
IMMUTABLE
AS $$
SELECT CASE
    WHEN v IS NULL OR btrim(v) = '' THEN NULL
    WHEN btrim(v) ~ '^[0-9]{8}$' THEN to_date(btrim(v), 'YYYYMMDD')
    ELSE NULL
END;
$$;

CREATE OR REPLACE FUNCTION ops.try_parse_mdy_timestamp(v text)
RETURNS timestamp
LANGUAGE sql
IMMUTABLE
AS $$
SELECT CASE
    WHEN v IS NULL OR btrim(v) = '' THEN NULL
    WHEN btrim(v) ~ '^[0-9]{2}/[0-9]{2}/[0-9]{2}\s+[0-9]{2}:[0-9]{2}:[0-9]{2}$'
        THEN to_timestamp(btrim(v), 'MM/DD/YY HH24:MI:SS')
    ELSE NULL
END;
$$;

CREATE OR REPLACE FUNCTION ops.try_numeric(v text)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
SELECT CASE
    WHEN v IS NULL OR btrim(v) = '' THEN NULL
    WHEN btrim(v) ~ '^[-+]?[0-9]*\.?[0-9]+$' THEN btrim(v)::numeric
    ELSE NULL
END;
$$;

DO $$
DECLARE
    missing_tables text[] := ARRAY[]::text[];
BEGIN
    IF to_regclass('raw.apdclrt') IS NULL THEN
        missing_tables := array_append(missing_tables, 'raw.apdclrt');
    END IF;
    IF to_regclass('raw.apdclct') IS NULL THEN
        missing_tables := array_append(missing_tables, 'raw.apdclct');
    END IF;
    IF to_regclass('raw.apdadrt') IS NULL THEN
        missing_tables := array_append(missing_tables, 'raw.apdadrt');
    END IF;
    IF to_regclass('raw.smdsdrt') IS NULL THEN
        missing_tables := array_append(missing_tables, 'raw.smdsdrt');
    END IF;
    IF to_regclass('raw.calc') IS NULL THEN
        missing_tables := array_append(missing_tables, 'raw.calc');
    END IF;
    IF to_regclass('raw.bk') IS NULL THEN
        missing_tables := array_append(missing_tables, 'raw.bk');
    END IF;

    IF array_length(missing_tables, 1) IS NOT NULL THEN
        RAISE EXCEPTION 'Missing required raw tables. Load CSVs first. Missing: %', array_to_string(missing_tables, ', ');
    END IF;
END
$$;

DROP TABLE IF EXISTS core.clients;
CREATE TABLE core.clients AS
SELECT DISTINCT
    btrim(clientno) AS client_no,
    NULLIF(btrim(clientshname), '') AS client_short_name,
    NULLIF(btrim(language), '') AS language,
    NULLIF(btrim(branch), '') AS branch,
    NULLIF(btrim(residentcode), '') AS resident_code,
    NULLIF(btrim(nonrescode), '') AS non_resident_code,
    NULLIF(btrim(citizenshipcode), '') AS citizenship_code,
    NULLIF(btrim(sin), '') AS sin,
    ops.try_parse_yyyymmdd(birthdate) AS birth_date,
    ops.try_parse_yyyymmdd(deceaseddate) AS deceased_date,
    ops.try_parse_yyyymmdd(origsetupdate) AS original_setup_date,
    ops.try_parse_yyyymmdd(lastupdatedate) AS last_update_date,
    now() AS model_built_at
FROM raw.apdclrt
WHERE btrim(clientno) <> '';

CREATE INDEX IF NOT EXISTS idx_core_clients_client_no ON core.clients (client_no);

DROP TABLE IF EXISTS core.accounts;
CREATE TABLE core.accounts AS
SELECT DISTINCT
    btrim(accountno) AS account_no,
    NULLIF(btrim(accounttype), '') AS account_type,
    NULLIF(btrim(accountclass), '') AS account_class,
    NULLIF(btrim(accountfunds), '') AS account_funds,
    NULLIF(btrim(rrcode), '') AS rr_code,
    NULLIF(btrim(branchno), '') AS branch_no,
    NULLIF(btrim(accountlang), '') AS account_lang,
    NULLIF(btrim(accountshname), '') AS account_short_name,
    NULLIF(btrim(regname), '') AS registration_name,
    ops.try_parse_yyyymmdd(initialdate) AS initial_date,
    ops.try_parse_yyyymmdd(lastupdatedate) AS last_update_date,
    ops.try_parse_yyyymmdd(lasttradedate) AS last_trade_date,
    ops.try_parse_yyyymmdd(closedate) AS close_date,
    now() AS model_built_at
FROM raw.apdadrt
WHERE btrim(accountno) <> '';

CREATE INDEX IF NOT EXISTS idx_core_accounts_account_no ON core.accounts (account_no);

DROP TABLE IF EXISTS core.client_accounts;
CREATE TABLE core.client_accounts AS
SELECT DISTINCT
    btrim(clientno) AS client_no,
    btrim(accountno) AS account_no,
    NULLIF(btrim(relationtype), '') AS relation_type,
    ops.try_parse_yyyymmdd(relnsetupdate) AS relation_setup_date,
    ops.try_parse_yyyymmdd(relnstartdate) AS relation_start_date,
    NULLIF(btrim(rrcode), '') AS rr_code,
    now() AS model_built_at
FROM raw.apdclct
WHERE btrim(clientno) <> ''
  AND btrim(accountno) <> '';

CREATE INDEX IF NOT EXISTS idx_core_client_accounts_client_no ON core.client_accounts (client_no);
CREATE INDEX IF NOT EXISTS idx_core_client_accounts_account_no ON core.client_accounts (account_no);

DROP TABLE IF EXISTS core.securities;
CREATE TABLE core.securities AS
SELECT DISTINCT
    btrim(secno) AS security_no,
    NULLIF(btrim(sectype), '') AS security_type,
    NULLIF(btrim(secclass), '') AS security_class,
    NULLIF(btrim(symbol), '') AS symbol,
    NULLIF(btrim(cusip), '') AS cusip,
    NULLIF(btrim(country), '') AS country,
    NULLIF(btrim(engsdesc), '') AS english_description,
    NULLIF(btrim(frsdesc), '') AS french_description,
    NULLIF(btrim(funds), '') AS funds,
    ops.try_numeric(cdnclspr) AS cad_close_price,
    ops.try_numeric(usclspr) AS usd_close_price,
    ops.try_parse_yyyymmdd(cdnprdt) AS cad_price_date,
    ops.try_parse_yyyymmdd(usprdt) AS usd_price_date,
    now() AS model_built_at
FROM raw.smdsdrt
WHERE btrim(secno) <> '';

CREATE INDEX IF NOT EXISTS idx_core_securities_security_no ON core.securities (security_no);
CREATE INDEX IF NOT EXISTS idx_core_securities_symbol ON core.securities (symbol);

DROP TABLE IF EXISTS core.trades;
CREATE TABLE core.trades AS
SELECT
    btrim(bkr) AS broker_no,
    NULLIF(btrim(acctbranch), '') AS account_branch,
    btrim(acctno) AS account_no,
    btrim(tradeno) AS trade_no,
    NULLIF(btrim(recordtype), '') AS record_type,
    NULLIF(btrim(buysell), '') AS buy_sell,
    NULLIF(btrim(cancel), '') AS cancel_flag,
    btrim(seccode) AS security_code,
    ops.try_parse_mdy_timestamp(procdate) AS process_ts,
    ops.try_parse_mdy_timestamp(tradedate) AS trade_ts,
    ops.try_parse_mdy_timestamp(valuedate) AS value_ts,
    ops.try_numeric(qty) AS quantity,
    ops.try_numeric(price) AS price,
    ops.try_numeric(netamt) AS net_amount,
    NULLIF(btrim(netamtfunds), '') AS net_amount_funds,
    now() AS model_built_at
FROM raw.calc
WHERE btrim(acctno) <> ''
  AND btrim(tradeno) <> '';

CREATE INDEX IF NOT EXISTS idx_core_trades_account_no ON core.trades (account_no);
CREATE INDEX IF NOT EXISTS idx_core_trades_trade_no ON core.trades (trade_no);
CREATE INDEX IF NOT EXISTS idx_core_trades_security_code ON core.trades (security_code);

DROP TABLE IF EXISTS core.bookings;
CREATE TABLE core.bookings AS
SELECT
    btrim(bkr) AS broker_no,
    NULLIF(btrim(acctbranch), '') AS account_branch,
    btrim(acctno) AS account_no,
    NULLIF(btrim(majtypecde), '') AS major_type_code,
    btrim(txnrefid) AS txn_ref_id,
    NULLIF(btrim(txnsubseq), '') AS txn_subseq,
    btrim(seccode) AS security_code,
    ops.try_parse_yyyymmdd(procdate) AS process_date,
    ops.try_parse_yyyymmdd(tradedate) AS trade_date,
    ops.try_parse_yyyymmdd(valuedate) AS value_date,
    ops.try_numeric(detamt) AS detail_amount,
    NULLIF(btrim(detamtfunds), '') AS detail_amount_funds,
    ops.try_numeric(detqty) AS detail_quantity,
    NULLIF(btrim(rrcode), '') AS rr_code,
    now() AS model_built_at
FROM raw.bk
WHERE btrim(acctno) <> ''
  AND btrim(txnrefid) <> '';

CREATE INDEX IF NOT EXISTS idx_core_bookings_account_no ON core.bookings (account_no);
CREATE INDEX IF NOT EXISTS idx_core_bookings_txn_ref_id ON core.bookings (txn_ref_id);

COMMIT;
