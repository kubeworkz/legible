#!/usr/bin/env python3
"""
Populate raw.bk_hist and raw.bkobal from synth data.

raw.bk_hist  (22,222 rows) — historical bookkeeping transactions
    Source: synth.bookkeeping, reverse-mapped through account_map so that
    synthetic account IDs become source account numbers.  Same 41-column
    schema as raw.bk.

raw.bkobal   (4,934 rows) — portfolio opening balances as of 1998-12-31
    Source: synth.account_holdings + account_map + account_profile.
    One row per account-security position.  The opening quantity = current
    holdings quantity; the opening book value ≈ cost price × quantity
    (derived the same deterministic way as the DAS scripts).
"""
import psycopg2
from datetime import datetime

CONN_PARAMS = dict(host="localhost", port=9432, dbname="ISM",
                   user="ism_admin", password="ism_secret")

conn = psycopg2.connect(**CONN_PARAMS)
cur = conn.cursor()
now = datetime.now()

# ── raw.bk_hist ───────────────────────────────────────────────────────────────
print("Fetching synth.bookkeeping rows...")
cur.execute("""
    SELECT
        b.broker_no,
        am.source_account_no                              AS acctno,
        b.major_type_code,
        to_char(b.value_date, 'YYYYMMDD')                AS valuedate,
        b.security_no                                     AS seccode,
        to_char(b.process_date, 'YYYYMMDD')               AS procdate,
        to_char(b.trade_date, 'YYYYMMDD')                 AS tradedate,
        b.txn_ref_id,
        b.txn_subseq,
        b.detail_amount,
        b.detail_amount_funds,
        b.detail_quantity,
        b.rr_code
    FROM synth.bookkeeping b
    JOIN synth.account_map am ON am.synthetic_account_no = b.account_no
    ORDER BY b.process_date, b.txn_ref_id
""")
bk_rows = cur.fetchall()
print(f"  {len(bk_rows)} booking rows")

cur.execute("TRUNCATE raw.bk_hist")

def fmt_num(v, decimals=4):
    """Format numeric value to string, empty if None/zero."""
    if v is None:
        return ''
    try:
        fv = float(v)
        return f"{fv:.{decimals}f}"
    except (TypeError, ValueError):
        return ''

bk_hist_data = []
for row in bk_rows:
    (broker_no, acctno, majtypecde, valuedate, seccode, procdate, tradedate,
     txnrefid, txnsubseq, detamt, detamtfunds, detqty, rrcode) = row

    # Determine sign reversal flag (1=positive, 2=negative convention in bk)
    # real raw.bk uses '1' for positive amounts, some use '2' for negatives
    detamt_f = float(detamt) if detamt is not None else 0.0
    detqty_f = float(detqty) if detqty is not None else 0.0
    sign_rev = '2' if detamt_f < 0 else '1'
    qty_sign_rev = '2' if detqty_f < 0 else '1'

    bk_hist_data.append((
        broker_no or '',          # bkr
        '',                       # acctbranch
        acctno,                   # acctno
        majtypecde or '',         # majtypecde
        valuedate or '',          # valuedate
        seccode or '',            # seccode
        procdate or '',           # procdate
        tradedate or '',          # tradedate
        txnrefid or '',           # txnrefid
        txnsubseq or '',          # txnsubseq
        '4',                      # bksrccde
        '4',                      # bkrcdcde
        '2',                      # bkadjcde
        'INVADJ',                 # detent
        '',                       # detdescrip
        fmt_num(detamt_f, 4),     # detamt
        detamtfunds or '',        # detamtfunds
        sign_rev,                 # detamtsignrev
        fmt_num(detqty_f, 4),     # detqty
        qty_sign_rev,             # detqtysignrev
        'L825BLBK',               # srcsys
        '',                       # detam2litype
        '0',                      # detam2
        '',                       # detamt2funds
        '1',                      # detam2signrev
        '',                       # detsecprice
        '',                       # detpricefunds
        rrcode or '',             # rrcode
        '',                       # mktcde
        '',                       # tradebasis
        '',                       # tradenum
        '0',                      # divinttyp
        '',                       # oldmktcde
        '',                       # oldph1mktcde
        '',                       # oldcomcde1
        '',                       # oldcomcde2
        '\\',                     # oldcde3
        'C',                      # oldamtfunds
        'Y',                      # oldfundctl
        'synth',
        now,
    ))

cur.executemany("""
    INSERT INTO raw.bk_hist (
        bkr, acctbranch, acctno, majtypecde, valuedate, seccode,
        procdate, tradedate, txnrefid, txnsubseq, bksrccde, bkrcdcde,
        bkadjcde, detent, detdescrip, detamt, detamtfunds, detamtsignrev,
        detqty, detqtysignrev, srcsys, detam2litype, detam2, detamt2funds,
        detam2signrev, detsecprice, detpricefunds, rrcode, mktcde,
        tradebasis, tradenum, divinttyp, oldmktcde, oldph1mktcde,
        oldcomcde1, oldcomcde2, oldcde3, oldamtfunds, oldfundctl,
        _source_file, _loaded_at
    ) VALUES (
        %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
        %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s
    )
""", bk_hist_data)
print(f"  Inserted {len(bk_hist_data)} rows into raw.bk_hist")


# ── raw.bkobal ─────────────────────────────────────────────────────────────────
print("\nFetching account holdings for opening balances...")
cur.execute("""
    SELECT
        am.source_account_no                         AS acctno,
        ah.secnum                                    AS secno,
        ap.rrcode,
        ap.accountfunds,
        ah.currqty,
        ah.mktprice,
        -- cost factor (same deterministic method as DAS scripts)
        (0.85 + 0.30 * abs(hashtext(am.source_account_no || ah.secnum)::float
                            / 2147483647.0))         AS cost_factor,
        row_number() OVER (ORDER BY am.source_account_no, ah.secnum) AS linenum
    FROM synth.account_holdings ah
    JOIN synth.account_map am ON am.synthetic_account_no = ah.acctno
    JOIN synth.account_profile ap ON ap.accountno = ah.acctno
    ORDER BY am.source_account_no, ah.secnum
""")
ob_rows = cur.fetchall()
print(f"  {len(ob_rows)} opening balance rows")

cur.execute("TRUNCATE raw.bkobal")

OPEN_DATE = '19981231'   # year-end 1998 — opening balance snapshot date
PRO_DATE  = '19990101'   # processing date (next business day)

bkobal_data = []
for row in ob_rows:
    (acctno, secno, rrcode, accountfunds, currqty, mktprice,
     cost_factor, linenum) = row

    mktprice_f   = float(mktprice)   if mktprice   else 0.0
    currqty_f    = float(currqty)    if currqty    else 0.0
    cost_f       = float(cost_factor)
    costprice_f  = mktprice_f * cost_f
    amtopbl_f    = costprice_f * currqty_f  # book value at open

    bkobal_data.append((
        str(int(linenum)),              # linenum
        acctno,                         # acctno
        OPEN_DATE,                      # subdate
        secno or '',                    # secno
        'O',                            # rectype (O=opening balance)
        '',                             # divcode
        '',                             # mktcode
        '',                             # balint
        rrcode or '',                   # rrcode
        fmt_num(currqty_f, 4),          # quantity
        fmt_num(amtopbl_f, 4),          # amtopbl
        '',                             # entcde
        '',                             # tradenum
        'OPENING BALANCE',              # entdesc
        'OPENING BALANCE',              # descrip
        '',                             # balcode
        PRO_DATE,                       # prodate
        accountfunds or 'CAD',          # funds
        '',                             # fundind
        OPEN_DATE,                      # valdate
        'synth',
        now,
    ))

cur.executemany("""
    INSERT INTO raw.bkobal (
        linenum, acctno, subdate, secno, rectype, divcode, mktcode,
        balint, rrcode, quantity, amtopbl, entcde, tradenum, entdesc,
        descrip, balcode, prodate, funds, fundind, valdate,
        _source_file, _loaded_at
    ) VALUES (
        %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s
    )
""", bkobal_data)
print(f"  Inserted {len(bkobal_data)} rows into raw.bkobal")


conn.commit()

# ── Verify ─────────────────────────────────────────────────────────────────────
print("\nVerification:")
for tbl in ("raw.bk_hist", "raw.bkobal"):
    cur.execute(f"SELECT count(*) FROM {tbl}")
    print(f"  {tbl}: {cur.fetchone()[0]} rows")

cur.execute("""
    SELECT bkr, acctno, majtypecde, procdate, valuedate, seccode,
           txnrefid, txnsubseq, detamt, detamtfunds, detqty, rrcode
    FROM raw.bk_hist LIMIT 5
""")
print("\nSample raw.bk_hist:")
print(f"  {'bkr':<10} {'acctno':<12} {'type':<5} {'procdate':<10} {'seccode':<12} {'txnrefid':<14} {'detamt':<20} {'rrcode'}")
for r in cur.fetchall():
    print(f"  {r[0]:<10} {r[1]:<12} {r[2]:<5} {r[3]:<10} {r[5]:<12} {r[6]:<14} {r[8]:<20} {r[11]}")

cur.execute("""
    SELECT linenum, acctno, subdate, secno, rectype, rrcode,
           quantity, amtopbl, funds, valdate
    FROM raw.bkobal LIMIT 5
""")
print("\nSample raw.bkobal:")
print(f"  {'linenum':<8} {'acctno':<12} {'subdate':<10} {'secno':<12} {'type':<5} {'rrcode':<8} {'quantity':<14} {'amtopbl':<18} funds")
for r in cur.fetchall():
    print(f"  {r[0]:<8} {r[1]:<12} {r[2]:<10} {r[3]:<12} {r[4]:<5} {r[5]:<8} {r[6]:<14} {r[7]:<18} {r[8]}")

cur.close()
conn.close()
print("\nDone.")
