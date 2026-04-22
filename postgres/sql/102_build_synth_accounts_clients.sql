BEGIN;

CREATE SCHEMA IF NOT EXISTS synth;

DROP TABLE IF EXISTS synth.account_registry;
CREATE TABLE synth.account_registry AS
SELECT
    a.account_no,
    a.account_type,
    a.account_class,
    a.account_funds,
    a.rr_code,
    a.branch_no,
    a.account_lang,
    a.account_short_name,
    a.registration_name,
    a.initial_date,
    a.last_update_date,
    a.last_trade_date,
    a.close_date,
    'core.accounts'::text AS account_origin
FROM core.accounts a
UNION ALL
SELECT
    x.account_no,
    NULL::text AS account_type,
    NULL::text AS account_class,
    NULL::text AS account_funds,
    NULL::text AS rr_code,
    NULL::text AS branch_no,
    NULL::text AS account_lang,
    NULL::text AS account_short_name,
    NULL::text AS registration_name,
    NULL::date AS initial_date,
    NULL::date AS last_update_date,
    NULL::date AS last_trade_date,
    NULL::date AS close_date,
    'transaction_fallback'::text AS account_origin
FROM (
    SELECT DISTINCT account_no
    FROM (
        SELECT account_no FROM core.trades
        UNION
        SELECT account_no FROM core.bookings
    ) z
    WHERE account_no IS NOT NULL AND btrim(account_no) <> ''
) x
LEFT JOIN core.accounts a ON a.account_no = x.account_no
WHERE a.account_no IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_synth_account_registry_no
    ON synth.account_registry (account_no);

DROP TABLE IF EXISTS synth.client_registry;
CREATE TABLE synth.client_registry AS
SELECT
    c.client_no,
    c.client_short_name,
    c.language,
    c.branch,
    c.resident_code,
    c.non_resident_code,
    c.citizenship_code,
    c.birth_date,
    c.deceased_date,
    c.original_setup_date,
    c.last_update_date,
    'core.clients'::text AS client_origin
FROM core.clients c
UNION ALL
SELECT
    'C_FALLBACK_' || lpad(row_number() OVER (ORDER BY ar.account_no)::text, 8, '0') AS client_no,
    NULL::text AS client_short_name,
    NULL::text AS language,
    NULL::text AS branch,
    NULL::text AS resident_code,
    NULL::text AS non_resident_code,
    NULL::text AS citizenship_code,
    NULL::date AS birth_date,
    NULL::date AS deceased_date,
    NULL::date AS original_setup_date,
    NULL::date AS last_update_date,
    'account_scaffold'::text AS client_origin
FROM synth.account_registry ar
WHERE NOT EXISTS (SELECT 1 FROM core.clients);

CREATE UNIQUE INDEX IF NOT EXISTS uq_synth_client_registry_no
    ON synth.client_registry (client_no);

DROP TABLE IF EXISTS synth.client_accounts;
CREATE TABLE synth.client_accounts AS
WITH account_ranked AS (
    SELECT
        ar.account_no,
        row_number() OVER (ORDER BY ar.account_no) AS rn
    FROM synth.account_registry ar
),
client_ranked AS (
    SELECT
        cr.client_no,
        row_number() OVER (ORDER BY cr.client_no) AS rn
    FROM synth.client_registry cr
)
SELECT
    x.client_no,
    x.account_no,
    x.relation_type,
    x.relation_setup_date,
    x.relation_start_date,
    x.rr_code,
    x.relation_origin
FROM (
    SELECT
        ca.client_no,
        ca.account_no,
        ca.relation_type,
        ca.relation_setup_date,
        ca.relation_start_date,
        ca.rr_code,
        'core.client_accounts'::text AS relation_origin
    FROM core.client_accounts ca

    UNION ALL

    SELECT
        c.client_no,
        a.account_no,
        'PRIMARY'::text AS relation_type,
        NULL::date AS relation_setup_date,
        NULL::date AS relation_start_date,
        NULL::text AS rr_code,
        'account_scaffold'::text AS relation_origin
    FROM account_ranked a
    JOIN client_ranked c ON c.rn = a.rn
    WHERE NOT EXISTS (SELECT 1 FROM core.client_accounts)
) x;

CREATE INDEX IF NOT EXISTS idx_synth_client_accounts_account_no
    ON synth.client_accounts (account_no);
CREATE INDEX IF NOT EXISTS idx_synth_client_accounts_client_no
    ON synth.client_accounts (client_no);

DROP TABLE IF EXISTS synth.accounts;
CREATE TABLE synth.accounts AS
SELECT
    am.synthetic_account_no AS account_no,
    ar.account_origin,
    ar.account_type,
    ar.account_class,
    ar.account_funds,
    ar.account_lang,
    ar.rr_code,
    ar.branch_no,
    CASE
        WHEN ar.account_short_name IS NULL THEN 'Account ' || right(am.synthetic_account_no, 6)
        ELSE 'Account ' || right(am.synthetic_account_no, 6)
    END AS account_short_name,
    CASE
        WHEN ar.registration_name IS NULL THEN 'Registrant ' || right(am.synthetic_account_no, 6)
        ELSE 'Registrant ' || right(am.synthetic_account_no, 6)
    END AS registration_name,
    ar.initial_date,
    ar.last_update_date,
    ar.last_trade_date,
    ar.close_date,
    now() AS generated_at
FROM synth.account_registry ar
JOIN synth.account_map am ON am.source_account_no = ar.account_no;

CREATE UNIQUE INDEX IF NOT EXISTS uq_synth_accounts_account_no
    ON synth.accounts (account_no);

DROP TABLE IF EXISTS synth.clients;
CREATE TABLE synth.clients AS
SELECT
    'CL' || lpad(row_number() OVER (ORDER BY cr.client_no)::text, 8, '0') AS client_no,
    cr.client_origin,
    COALESCE(cr.language, 'E') AS language,
    COALESCE(cr.branch, '00000000') AS branch,
    COALESCE(cr.resident_code, '00') AS resident_code,
    COALESCE(cr.non_resident_code, '0') AS non_resident_code,
    COALESCE(cr.citizenship_code, '00') AS citizenship_code,
    cr.birth_date,
    cr.deceased_date,
    cr.original_setup_date,
    cr.last_update_date,
    now() AS generated_at
FROM synth.client_registry cr;

CREATE UNIQUE INDEX IF NOT EXISTS uq_synth_clients_client_no
    ON synth.clients (client_no);

DROP TABLE IF EXISTS synth.client_account_links;
CREATE TABLE synth.client_account_links AS
WITH client_ranked AS (
    SELECT
        client_no,
        row_number() OVER (ORDER BY client_no) AS rn
    FROM synth.clients
),
client_registry_ranked AS (
    SELECT
        client_no,
        row_number() OVER (ORDER BY client_no) AS rn
    FROM synth.client_registry
)
SELECT
    c.client_no,
    a.account_no,
    l.relation_type,
    l.relation_setup_date,
    l.relation_start_date,
    l.relation_origin,
    now() AS generated_at
FROM synth.client_accounts l
JOIN synth.account_map am ON am.source_account_no = l.account_no
JOIN synth.accounts a ON a.account_no = am.synthetic_account_no
JOIN client_registry_ranked scr ON scr.client_no = l.client_no
JOIN client_ranked c ON c.rn = scr.rn;

CREATE INDEX IF NOT EXISTS idx_synth_client_account_links_account_no
    ON synth.client_account_links (account_no);
CREATE INDEX IF NOT EXISTS idx_synth_client_account_links_client_no
    ON synth.client_account_links (client_no);

COMMIT;
