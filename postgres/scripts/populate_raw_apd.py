#!/usr/bin/env python3
"""
Populate raw.apdadrt, raw.apdclrt, raw.apdclct from synth data.

Source mapping:
  raw.apdadrt  (account master) ← synth.account_profile + synth.account_map
  raw.apdclrt  (client master)  ← synth.client_profile + client_account_links + account_map
  raw.apdclct  (client-account) ← synth.client_account_links + account_map

Client IDs in the raw tables use the source_account_no as the clientno (1:1 primary
relationship — common in legacy brokerage systems).  This makes core.clients.client_no
match source account numbers, which is consistent with how core.client_accounts links.
"""
import psycopg2
from datetime import datetime

conn = psycopg2.connect(
    host="localhost", port=9432,
    dbname="ISM", user="ism_admin", password="ism_secret"
)
cur = conn.cursor()
now = datetime.utcnow()

# ── raw.apdadrt ───────────────────────────────────────────────────────────────
print("Fetching account profile data...")
cur.execute("""
    SELECT
        am.source_account_no        AS accountno,
        ap.accounttype,
        ap.accountfunds,
        ap.accountclass,
        ap.rrcode,
        ap.branchno,
        nam.lang_ind                AS accountlang,
        ap.accountshname,
        ap.regname,
        ap.accountsin,
        ap.initialdate,
        ap.lastupdatedate,
        ap.lasttradedate,
        ap.closedate,
        ap.reportingcode,
        ap.commissioncode,
        ap.commissionrate,
        ap.delinstr,
        ap.planningcode
    FROM synth.account_map am
    JOIN synth.account_profile ap ON ap.accountno = am.synthetic_account_no
    LEFT JOIN synth.name_address_master nam ON nam.acct = am.synthetic_account_no
    ORDER BY am.source_account_no
""")
ap_rows = cur.fetchall()

print(f"  {len(ap_rows)} account rows")

cur.execute("TRUNCATE raw.apdadrt")

# Build insert with the columns 001_build_core.sql reads PLUS a few extra
# for completeness. The remaining 100+ columns stay NULL (all text, nullable).
apdadrt_data = []
for row in ap_rows:
    (accountno, accounttype, accountfunds, accountclass, rrcode, branchno,
     accountlang, accountshname, regname, accountsin, initialdate,
     lastupdatedate, lasttradedate, closedate, reportingcode,
     commissioncode, commissionrate, delinstr, planningcode) = row

    apdadrt_data.append((
        accountno,
        accounttype or '',
        accountfunds or '',
        accountclass or '',
        rrcode or '',
        branchno or '',
        accountlang or 'E',
        accountshname or '',
        regname or '',
        accountsin or '',
        initialdate or '',
        lastupdatedate or '',
        lasttradedate or '',
        closedate or '',
        reportingcode or '',
        commissioncode or 'STD',
        commissionrate or '',
        delinstr or '',
        planningcode or '',
        'synth',
        now,
    ))

cur.executemany("""
    INSERT INTO raw.apdadrt (
        accountno, accounttype, accountfunds, accountclass, rrcode, branchno,
        accountlang, accountshname, regname, accountsin,
        initialdate, lastupdatedate, lasttradedate, closedate,
        reportingcode, commissioncode, commissionrate, delinstr, planningcode,
        _source_file, _loaded_at
    ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
""", apdadrt_data)
print(f"  Inserted {len(apdadrt_data)} rows into raw.apdadrt")


# ── raw.apdclrt ───────────────────────────────────────────────────────────────
print("\nFetching client profile data...")
cur.execute("""
    SELECT
        am.source_account_no        AS clientno,
        cp.language,
        cp.clientshname,
        cp.branch,
        cp.residentcode,
        cp.nonrescode,
        cp.citizenshipcode,
        cp.telephone,
        cp.sin,
        cp.birthdate,
        cp.deceaseddate,
        cp.occupation,
        cp.maritalstatus,
        cp.spousename,
        cp.employer,
        cp.networth,
        cp.investobj1,
        cp.investobj2,
        cp.investobj3,
        cp.risktolerance,
        cp.investknowledge,
        cp.investexper,
        cp.discretauth,
        cp.dateknowtorr,
        cp.rrinterest,
        cp.introrrcode
    FROM synth.client_account_links cal
    JOIN synth.account_map am ON am.synthetic_account_no = cal.account_no
    JOIN synth.client_profile cp ON cp.clientno = cal.client_no
    WHERE cal.relation_type = 'PRIMARY'
    ORDER BY am.source_account_no
""")
cp_rows = cur.fetchall()
print(f"  {len(cp_rows)} client rows")

cur.execute("TRUNCATE raw.apdclrt")

apdclrt_data = []
for row in cp_rows:
    (clientno, language, clientshname, branch, residentcode, nonrescode,
     citizenshipcode, telephone, sin, birthdate, deceaseddate, occupation,
     maritalstatus, spousename, employer, networth, investobj1, investobj2,
     investobj3, risktolerance, investknowledge, investexper, discretauth,
     dateknowtorr, rrinterest, introrrcode) = row

    apdclrt_data.append((
        clientno,
        language or 'E',
        clientshname or '',
        branch or '',
        residentcode or '00',
        nonrescode or '0',
        citizenshipcode or '00',
        telephone or '',
        sin or '',
        birthdate or '',
        deceaseddate or '',
        occupation or '',
        maritalstatus or '',
        spousename or '',
        employer or '',
        networth or '',
        investobj1 or '',
        investobj2 or '',
        investobj3 or '',
        risktolerance or '',
        investknowledge or '',
        investexper or '',
        discretauth or '',
        dateknowtorr or '',
        rrinterest or '',
        introrrcode or '',
        'synth',
        now,
    ))

cur.executemany("""
    INSERT INTO raw.apdclrt (
        clientno, language, clientshname, branch, residentcode, nonrescode,
        citizenshipcode, telephone, sin, birthdate, deceaseddate,
        occupation, maritalstatus, spousename, employer, networth,
        investobj1, investobj2, investobj3, risktolerance, investknowledge,
        investexper, discretauth, dateknowtorr, rrinterest, introrrcode,
        _source_file, _loaded_at
    ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
""", apdclrt_data)
print(f"  Inserted {len(apdclrt_data)} rows into raw.apdclrt")


# ── raw.apdclct ───────────────────────────────────────────────────────────────
print("\nFetching client-account link data...")
cur.execute("""
    SELECT
        am.source_account_no        AS accountno,
        am.source_account_no        AS clientno,
        cal.relation_type           AS relationtype,
        to_char(cal.relation_setup_date, 'YYYYMMDD')  AS relnsetupdate,
        to_char(cal.relation_start_date, 'YYYYMMDD')  AS relnstartdate,
        ap.rrcode
    FROM synth.client_account_links cal
    JOIN synth.account_map am ON am.synthetic_account_no = cal.account_no
    JOIN synth.account_profile ap ON ap.accountno = cal.account_no
    WHERE cal.relation_type = 'PRIMARY'
    ORDER BY am.source_account_no
""")
ca_rows = cur.fetchall()
print(f"  {len(ca_rows)} client-account link rows")

cur.execute("TRUNCATE raw.apdclct")

apdclct_data = []
for row in ca_rows:
    (accountno, clientno, relationtype, relnsetupdate, relnstartdate, rrcode) = row
    apdclct_data.append((
        accountno,
        clientno,
        relationtype or 'PRIMARY',
        relnsetupdate or '',
        relnstartdate or '',
        rrcode or '',
        'synth',
        now,
    ))

cur.executemany("""
    INSERT INTO raw.apdclct (
        accountno, clientno, relationtype, relnsetupdate, relnstartdate,
        rrcode, _source_file, _loaded_at
    ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
""", apdclct_data)
print(f"  Inserted {len(apdclct_data)} rows into raw.apdclct")


conn.commit()

# ── Verify ────────────────────────────────────────────────────────────────────
print("\nVerification:")
for tbl in ("raw.apdadrt", "raw.apdclrt", "raw.apdclct"):
    cur.execute(f"SELECT count(*) FROM {tbl}")
    print(f"  {tbl}: {cur.fetchone()[0]} rows")

# Sample from apdadrt
cur.execute("""
    SELECT accountno, accounttype, accountfunds, accountshname, regname, accountsin, rrcode
    FROM raw.apdadrt LIMIT 5
""")
print("\nSample raw.apdadrt:")
print(f"  {'accountno':<12} {'type':<5} {'funds':<5} {'accountshname':<18} {'regname':<18} {'sin':<12} rrcode")
for r in cur.fetchall():
    print(f"  {r[0]:<12} {r[1]:<5} {r[2]:<5} {r[3]:<18} {r[4]:<18} {r[5]:<12} {r[6]}")

# Sample from apdclrt
cur.execute("""
    SELECT clientno, language, clientshname, telephone, sin, occupation, employer
    FROM raw.apdclrt LIMIT 5
""")
print("\nSample raw.apdclrt:")
print(f"  {'clientno':<12} {'lang':<5} {'clientshname':<18} {'telephone':<14} {'sin':<12} {'occ':<4} employer")
for r in cur.fetchall():
    print(f"  {r[0]:<12} {r[1]:<5} {r[2]:<18} {r[3]:<14} {r[4]:<12} {r[5]:<4} {r[6]}")

cur.close()
conn.close()
print("\nDone.")
