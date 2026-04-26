#!/usr/bin/env python3
"""
Populate raw.das11, raw.das12, raw.das13 from synth data.

Each DAS table has one row per account-security position (4,934 rows).
  das11 = per-position account summary (account header + position market data)
  das12 = per-position security detail (interest, coupon, pricing, dates)
  das13 = per-position P&L and cost/market values

Account numbers in raw.das* use source_account_no (same as raw.apdadrt).
Security numbers use the synth.security_master.secno (e.g. 'S00001134').
A synthetic cost price is derived deterministically via hashtext for realism.
"""
import psycopg2
from datetime import datetime

CONN_PARAMS = dict(host="localhost", port=9432, dbname="ISM",
                   user="ism_admin", password="ism_secret")

conn = psycopg2.connect(**CONN_PARAMS)
cur = conn.cursor()
now = datetime.now()

# ── Fetch base join: positions + account profile + security master ─────────────
print("Fetching position data...")
cur.execute("""
    WITH account_totals AS (
        SELECT
            ah.acctno,
            sum(ah.mktvalue)   AS total_mktval,
            sum(ah.loanvalue)  AS total_loanval
        FROM synth.account_holdings ah
        GROUP BY ah.acctno
    )
    SELECT
        am.source_account_no                         AS src_acctno,
        ah.secnum                                    AS secno,
        ap.accounttype,
        ap.accountfunds,
        ap.rrcode,
        ap.branchno,
        COALESCE(nam.lang_ind, 'E')               AS accountlang,
        ap.accountshname,
        ap.accountclass,
        ap.delinstr,
        ap.reportingcode,
        ap.commissionrate,
        -- holdings
        ah.currqty,
        ah.sfkqty,
        ah.pendqty,
        ah.memoqty,
        ah.mktprice,
        ah.mktvalue,
        ah.loanvalue,
        ah.loanrate,
        ah.lasttradedatestr,
        -- account totals (repeated per row)
        at.total_mktval,
        at.total_loanval,
        -- security master
        sm.sectype,
        sm.secclass,
        sm.engsdesc,
        sm.cusip,
        sm.payfreq,
        sm.payrate,
        sm.expmatdt,
        sm.funds                                     AS sec_funds,
        sm.cdnbidpr,
        sm.cdnaskpr,
        sm.cdnclspr,
        sm.cdnprdt,
        -- deterministic cost factor via hash (for reproducible P&L)
        (0.85 + 0.30 * abs(hashtext(am.source_account_no || ah.secnum)::float
                            / 2147483647.0))         AS cost_factor
    FROM synth.account_holdings ah
    JOIN synth.account_map am ON am.synthetic_account_no = ah.acctno
    JOIN synth.account_profile ap ON ap.accountno = ah.acctno
    JOIN account_totals at ON at.acctno = ah.acctno
    LEFT JOIN synth.security_master sm ON sm.secno = ah.secnum
    LEFT JOIN synth.name_address_master nam ON nam.acct = ah.acctno
    ORDER BY am.source_account_no, ah.secnum
""")
rows = cur.fetchall()
print(f"  {len(rows)} position rows")

COL = [d[0] for d in cur.description]
def col(row, name):
    return row[COL.index(name)]

def fmt(v, decimals=4):
    """Format numeric to string, empty string if None."""
    if v is None:
        return ''
    try:
        return f"{float(v):.{decimals}f}"
    except (TypeError, ValueError):
        return str(v) if v else ''

def s(v):
    """Return string, empty if None."""
    if v is None:
        return ''
    return str(v).strip()


# ── raw.das11 ──────────────────────────────────────────────────────────────────
print("\nPopulating raw.das11...")
cur.execute("TRUNCATE raw.das11")

das11_data = []
for row in rows:
    src_acctno    = col(row, 'src_acctno')
    accttype      = s(col(row, 'accounttype'))
    acctfunds     = s(col(row, 'accountfunds'))
    rrcode        = s(col(row, 'rrcode'))
    rrbranch      = s(col(row, 'branchno'))
    acctclass     = s(col(row, 'accountclass'))
    lang          = s(col(row, 'accountlang')) or 'E'
    delinstr      = s(col(row, 'delinstr'))
    sname         = s(col(row, 'accountshname'))
    currqty       = col(row, 'currqty')
    mktprice      = col(row, 'mktprice')
    mktvalue      = col(row, 'mktvalue')
    loanvalue     = col(row, 'loanvalue')
    loanrate      = col(row, 'loanrate')
    ltdatestr     = s(col(row, 'lasttradedatestr'))
    total_mktval  = col(row, 'total_mktval')
    total_loanval = col(row, 'total_loanval')
    engsdesc      = s(col(row, 'engsdesc'))
    cost_factor   = col(row, 'cost_factor')

    # Compute cost price and P&L
    mktprice_f = float(mktprice) if mktprice else 0.0
    currqty_f  = float(currqty)  if currqty  else 0.0
    cost_f     = float(cost_factor) if cost_factor else 1.0
    costprice_f = mktprice_f * cost_f
    pl_f = (mktprice_f - costprice_f) * currqty_f

    # ltdate from lasttradedatestr (already YYYYMMDD text)
    ltdate = ltdatestr  # text column

    das11_data.append((
        src_acctno,           # acctno
        accttype,             # accttype
        acctfunds,            # acctfunds
        rrcode,               # rrcode2
        rrbranch,             # rrbranch
        acctclass,            # acctclass
        '',                   # crlimit
        '',                   # optauthcode
        lang,                 # lang
        delinstr,             # delinstr
        '',                   # divcfm
        '',                   # drint
        '',                   # crint
        '',                   # res
        '',                   # nonres
        sname,                # sname
        '',                   # mebknetchng
        '',                   # metdbal
        '',                   # mesdbal
        '',                   # prevmebknetchng
        '',                   # lbkdatestr
        '',                   # currtdbal
        '',                   # currsdbal
        '',                   # field27
        '',                   # sdvalshorts
        fmt(total_mktval, 4), # tdmktval
        '',                   # tdmktvalsfk
        fmt(total_loanval,4), # tdloanval
        '',                   # tdloanvalsfk
        '',                   # tdreqmgn
        '',                   # tdreqsec
        '',                   # prevstat
        '',                   # prevdelinq
        '',                   # currstat
        '',                   # currdelinq
        engsdesc,             # invsecdesc
        '',                   # metdint
        '',                   # mesdint
        '',                   # metdqty
        '',                   # mesdqty
        '',                   # currtdint
        '',                   # currsdint
        fmt(currqty, 0),      # currtdqty
        fmt(currqty, 0),      # currsdqty
        fmt(mktprice_f, 4),   # mktprice
        fmt(costprice_f, 4),  # costprice
        s(loanrate),          # loanrate
        '',                   # mgnratecode
        fmt(pl_f, 4),         # pl
        '',                   # meintchange
        '',                   # meqtychange
        '',                   # btmqty
        ltdatestr,            # ltdatestr
        '',                   # ytm
        '',                   # menetcarry
        '',                   # curryldovrride
        '',                   # meyldovrride
        '',                   # mepriceovrride
        '',                   # melongrateovr
        '',                   # meshrtrateovr
        '',                   # evaldatestr
        '',                   # cltinfo
        rrcode,               # rrcode
        '',                   # lbkdate
        ltdate,               # ltdate
        '',                   # evaldate
        'synth',
        now,
    ))

cur.executemany("""
    INSERT INTO raw.das11 (
        acctno, accttype, acctfunds, rrcode2, rrbranch, acctclass,
        crlimit, optauthcode, lang, delinstr, divcfm, drint, crint,
        res, nonres, sname, mebknetchng, metdbal, mesdbal, prevmebknetchng,
        lbkdatestr, currtdbal, currsdbal, field27, sdvalshorts,
        tdmktval, tdmktvalsfk, tdloanval, tdloanvalsfk, tdreqmgn, tdreqsec,
        prevstat, prevdelinq, currstat, currdelinq, invsecdesc,
        metdint, mesdint, metdqty, mesdqty, currtdint, currsdint,
        currtdqty, currsdqty, mktprice, costprice, loanrate, mgnratecode, pl,
        meintchange, meqtychange, btmqty, ltdatestr, ytm, menetcarry,
        curryldovrride, meyldovrride, mepriceovrride, melongrateovr, meshrtrateovr,
        evaldatestr, cltinfo, rrcode, lbkdate, ltdate, evaldate,
        _source_file, _loaded_at
    ) VALUES (
        %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
        %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
        %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
        %s,%s,%s,%s,%s,%s,%s,%s
    )
""", das11_data)
print(f"  Inserted {len(das11_data)} rows into raw.das11")


# ── raw.das12 ──────────────────────────────────────────────────────────────────
print("\nPopulating raw.das12...")
cur.execute("TRUNCATE raw.das12")

das12_data = []
for row in rows:
    src_acctno   = col(row, 'src_acctno')
    secno        = s(col(row, 'secno'))
    sectype      = s(col(row, 'sectype'))
    secclass     = s(col(row, 'secclass'))
    cusip        = s(col(row, 'cusip'))
    engsdesc     = s(col(row, 'engsdesc'))
    payfreq      = s(col(row, 'payfreq'))
    payrate      = col(row, 'payrate')
    expmatdt     = s(col(row, 'expmatdt'))
    sec_funds    = s(col(row, 'sec_funds'))
    cdnbidpr     = col(row, 'cdnbidpr')
    cdnaskpr     = col(row, 'cdnaskpr')
    cdnclspr     = col(row, 'cdnclspr')
    cdnprdt      = s(col(row, 'cdnprdt'))
    mktprice     = col(row, 'mktprice')
    cost_factor  = col(row, 'cost_factor')
    currqty      = col(row, 'currqty')

    # Accrued interest: for bonds with payrate, estimate daily
    payrate_f = float(payrate) if payrate else 0.0
    mktprice_f = float(mktprice) if mktprice else 0.0
    currqty_f = float(currqty) if currqty else 0.0
    # bonds (sectype 3xx) have interest; others don't
    is_bond = sectype.startswith('3') if sectype else False
    accrint_f = (payrate_f / 100.0 / 365.0 * 90 * mktprice_f * currqty_f / 100.0) if is_bond else 0.0

    das12_data.append((
        src_acctno,           # acctno
        sectype[:2] if sectype else '',  # secgroup (first 2 chars of sectype)
        secno,                # relsecno
        'L',                  # reltype (L=long)
        cusip,                # cusip
        sectype,              # sectype
        secclass,             # secclass
        '',                   # expdatestr
        '',                   # cvtdatestr
        '',                   # nrtrate
        '',                   # lastmedatestr
        '',                   # opteligible
        '',                   # daysinact
        engsdesc,             # secdesc
        payfreq,              # payfreq
        '',                   # padacttype
        '',                   # intdisc
        '',                   # cat
        sec_funds,            # intfunds
        '',                   # recorddatestr
        '',                   # nextcpndatestr
        '',                   # lastcpndatestr
        '',                   # issueddatestr
        fmt(payrate_f, 4),    # intrate
        fmt(payrate_f, 4),    # cpnrate
        '',                   # calldatestr
        expmatdt,             # matdatestr
        '',                   # extdatestr
        '',                   # retrdatestr
        '',                   # adjmetdqty
        '',                   # adjmesdqty
        '',                   # adjmetdbal
        '',                   # adjmesdbal
        '',                   # adjmetdint
        '',                   # adjmesdint
        '',                   # carryrate
        '',                   # carrysrc
        '',                   # mecarryrate
        '',                   # mecarryratesrc
        '',                   # carryovrper
        fmt(accrint_f, 4),    # accrint
        '',                   # intpl
        '',                   # intearn
        '',                   # intexpense
        '',                   # cpnamt
        '',                   # adjmeaccrint
        '',                   # adjmeintpl
        '',                   # adjmeintearn
        '',                   # adjmeintexp
        '',                   # adjmecpnamt
        '',                   # cumcrycst
        '',                   # negcumcrycst
        '',                   # mecumcrycst
        '',                   # negmecumcrycst
        fmt(cdnbidpr) if cdnbidpr else '',    # curbidprice
        fmt(cdnaskpr) if cdnaskpr else '',    # curaskprice
        fmt(mktprice_f, 4),   # curcloseprice
        sec_funds,            # fundscurprice
        '',                   # srccurprice
        cdnprdt,              # datecurpricestr
        '',                   # curpriceovr
        '',                   # mebidprice
        '',                   # measkprice
        '',                   # mecloseprice
        '',                   # fundsmeprice
        '',                   # srcmeprice
        '',                   # curcostpriceovr
        '',                   # mecostpriceovr
        '',                   # curcpnmemoint
        '',                   # mecpnmemoint
        '',                   # negcryrateovr
        payfreq,              # curpayfreq
        payfreq,              # prvpayfreq
        '',                   # curacttype
        '',                   # prvacttype
        '',                   # currecdatestr
        '',                   # prvrecdatestr
        '',                   # curpaydatestr
        '',                   # prvpaydatestr
        fmt(payrate_f, 4) if payrate_f else '',  # curdivrate
        fmt(payrate_f, 4) if payrate_f else '',  # prvdivrate
        sec_funds,            # curdivfunds
        sec_funds,            # prvdivfunds
        '',                   # calldate
        '',                   # curpaydate
        '',                   # currecdate
        '',                   # cvtdate
        cdnprdt,              # datecurprice
        '',                   # expdate
        '',                   # extdate
        '',                   # issueddate
        '',                   # lastcpndate
        '',                   # lastmedate
        expmatdt,             # matdate
        '',                   # nextcpndate
        '',                   # prvpaydate
        '',                   # prvrecdate
        '',                   # recorddate
        '',                   # retrdate
        'synth',
        now,
    ))

cur.executemany("""
    INSERT INTO raw.das12 (
        acctno, secgroup, relsecno, reltype, cusip, sectype, secclass,
        expdatestr, cvtdatestr, nrtrate, lastmedatestr, opteligible, daysinact,
        secdesc, payfreq, padacttype, intdisc, cat, intfunds,
        recorddatestr, nextcpndatestr, lastcpndatestr, issueddatestr,
        intrate, cpnrate, calldatestr, matdatestr, extdatestr, retrdatestr,
        adjmetdqty, adjmesdqty, adjmetdbal, adjmesdbal, adjmetdint, adjmesdint,
        carryrate, carrysrc, mecarryrate, mecarryratesrc, carryovrper,
        accrint, intpl, intearn, intexpense, cpnamt,
        adjmeaccrint, adjmeintpl, adjmeintearn, adjmeintexp, adjmecpnamt,
        cumcrycst, negcumcrycst, mecumcrycst, negmecumcrycst,
        curbidprice, curaskprice, curcloseprice, fundscurprice, srccurprice,
        datecurpricestr, curpriceovr, mebidprice, measkprice, mecloseprice,
        fundsmeprice, srcmeprice, curcostpriceovr, mecostpriceovr,
        curcpnmemoint, mecpnmemoint, negcryrateovr,
        curpayfreq, prvpayfreq, curacttype, prvacttype,
        currecdatestr, prvrecdatestr, curpaydatestr, prvpaydatestr,
        curdivrate, prvdivrate, curdivfunds, prvdivfunds,
        calldate, curpaydate, currecdate, cvtdate, datecurprice,
        expdate, extdate, issueddate, lastcpndate, lastmedate,
        matdate, nextcpndate, prvpaydate, prvrecdate, recorddate, retrdate,
        _source_file, _loaded_at
    ) VALUES (
        %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
        %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
        %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
        %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
        %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s
    )
""", das12_data)
print(f"  Inserted {len(das12_data)} rows into raw.das12")


# ── raw.das13 ──────────────────────────────────────────────────────────────────
print("\nPopulating raw.das13...")
cur.execute("TRUNCATE raw.das13")

das13_data = []
for row in rows:
    src_acctno   = col(row, 'src_acctno')
    mktprice     = col(row, 'mktprice')
    mktvalue     = col(row, 'mktvalue')
    currqty      = col(row, 'currqty')
    cost_factor  = col(row, 'cost_factor')

    mktprice_f  = float(mktprice)    if mktprice   else 0.0
    mktvalue_f  = float(mktvalue)    if mktvalue   else 0.0
    currqty_f   = float(currqty)     if currqty    else 0.0
    cost_f      = float(cost_factor) if cost_factor else 1.0
    costprice_f = mktprice_f * cost_f
    costval_f   = costprice_f * currqty_f
    plunreal_f  = mktvalue_f - costval_f

    das13_data.append((
        src_acctno,           # acctno
        '',                   # dlyintinc
        '',                   # dlycrycst
        '',                   # dlynetcrycst
        '',                   # dlynetintpl
        fmt(mktvalue_f, 4),   # curtdbkval (using mktvalue as book value)
        fmt(costprice_f, 4),  # curtdcstpr
        fmt(mktvalue_f, 4),   # cursdbkval
        fmt(costprice_f, 4),  # cursdcstpr
        '',                   # adjmetdbkval
        '',                   # adjmetdcstpr
        '',                   # adjmesdbkval
        '',                   # adjmesdcstpr
        '',                   # mebtmtdcstpr
        '',                   # curbtmsdcstpr
        '',                   # curbtmdatestr
        '',                   # mebtmdatestr
        '',                   # btmind
        '',                   # dayssinceme
        '',                   # mktprytm
        '',                   # tdcstytm
        fmt(mktvalue_f, 4),   # curtdmktval
        fmt(mktvalue_f, 4),   # cursdmktval
        '',                   # adjmetdmktval
        '',                   # adjmesdmktval
        '',                   # curlongmgnrt
        '',                   # curlongdaysovr
        '',                   # curshrtmgnrt
        '',                   # curshrtdaysovr
        '',                   # melongmgnrt
        '',                   # meshrtmgnrt
        '',                   # curtdmgndlr
        '',                   # cursdmgndlr
        '',                   # curtdmgntrdr
        '',                   # cursdmgntrdr
        '',                   # adjmetdmgndlr
        '',                   # adjmesdmgndlr
        '',                   # adjmetdmgntrdr
        '',                   # adjmesdmgntrdr
        '',                   # curtdplreal (realized P&L unknown)
        fmt(plunreal_f, 4),   # curtdplunreal (unrealized P&L)
        fmt(plunreal_f, 4),   # curtdpltotal
        '',                   # cursdplreal
        fmt(plunreal_f, 4),   # cursdplunreal
        fmt(plunreal_f, 4),   # cursdpltotal
        '',                   # adjmetdplreal
        '',                   # adjmetdplunreal
        '',                   # adjmetdpltotal
        '',                   # adjmesdplreal
        '',                   # adjmesdplunreal
        '',                   # adjmesdpltotal
        '',                   # todaystdtotpl
        '',                   # todayssdtotpl
        '',                   # percentannret
        '',                   # rocsddlr
        '',                   # rocsdtrd
        '',                   # merptctl
        '',                   # curbtmdate
        '',                   # mebtmdate
        'synth',
        now,
    ))

cur.executemany("""
    INSERT INTO raw.das13 (
        acctno, dlyintinc, dlycrycst, dlynetcrycst, dlynetintpl,
        curtdbkval, curtdcstpr, cursdbkval, cursdcstpr,
        adjmetdbkval, adjmetdcstpr, adjmesdbkval, adjmesdcstpr,
        mebtmtdcstpr, curbtmsdcstpr, curbtmdatestr, mebtmdatestr, btmind,
        dayssinceme, mktprytm, tdcstytm,
        curtdmktval, cursdmktval, adjmetdmktval, adjmesdmktval,
        curlongmgnrt, curlongdaysovr, curshrtmgnrt, curshrtdaysovr,
        melongmgnrt, meshrtmgnrt,
        curtdmgndlr, cursdmgndlr, curtdmgntrdr, cursdmgntrdr,
        adjmetdmgndlr, adjmesdmgndlr, adjmetdmgntrdr, adjmesdmgntrdr,
        curtdplreal, curtdplunreal, curtdpltotal,
        cursdplreal, cursdplunreal, cursdpltotal,
        adjmetdplreal, adjmetdplunreal, adjmetdpltotal,
        adjmesdplreal, adjmesdplunreal, adjmesdpltotal,
        todaystdtotpl, todayssdtotpl, percentannret,
        rocsddlr, rocsdtrd, merptctl, curbtmdate, mebtmdate,
        _source_file, _loaded_at
    ) VALUES (
        %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
        %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
        %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s
    )
""", das13_data)
print(f"  Inserted {len(das13_data)} rows into raw.das13")


conn.commit()

# ── Verify ─────────────────────────────────────────────────────────────────────
print("\nVerification:")
for tbl in ("raw.das11", "raw.das12", "raw.das13"):
    cur.execute(f"SELECT count(*) FROM {tbl}")
    print(f"  {tbl}: {cur.fetchone()[0]} rows")

cur.execute("""
    SELECT acctno, accttype, acctfunds, sname, tdmktval, currtdqty, mktprice, pl
    FROM raw.das11 LIMIT 5
""")
print("\nSample raw.das11:")
print(f"  {'acctno':<12} {'type':<5} {'funds':<5} {'sname':<18} {'tdmktval':<18} {'qty':<10} {'mktprice':<12} pl")
for r in cur.fetchall():
    print(f"  {r[0]:<12} {r[1]:<5} {r[2]:<5} {r[3]:<18} {r[4]:<18} {r[5]:<10} {r[6]:<12} {r[7]}")

cur.execute("""
    SELECT acctno, relsecno, sectype, cusip, secdesc, curcloseprice, matdate
    FROM raw.das12 LIMIT 5
""")
print("\nSample raw.das12:")
print(f"  {'acctno':<12} {'secno':<12} {'type':<6} {'cusip':<12} {'secdesc':<28} {'price':<12} matdate")
for r in cur.fetchall():
    print(f"  {r[0]:<12} {r[1]:<12} {r[2]:<6} {r[3]:<12} {r[4]:<28} {r[5]:<12} {r[6]}")

cur.execute("""
    SELECT acctno, curtdmktval, curtdcstpr, curtdplunreal, curtdpltotal
    FROM raw.das13 LIMIT 5
""")
print("\nSample raw.das13:")
print(f"  {'acctno':<12} {'curtdmktval':<20} {'curtdcstpr':<16} {'plunreal':<16} pltotal")
for r in cur.fetchall():
    print(f"  {r[0]:<12} {r[1]:<20} {r[2]:<16} {r[3]:<16} {r[4]}")

cur.close()
conn.close()
print("\nDone.")
