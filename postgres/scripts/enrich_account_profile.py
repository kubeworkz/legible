#!/usr/bin/env python3
"""
Update synth.account_profile with realistic names, registration names,
SINs (from name_address_master), and commission rates.
"""
import psycopg2
import random

random.seed(42)

conn = psycopg2.connect(
    host="localhost", port=9432,
    dbname="ISM", user="ism_admin", password="ism_secret"
)
cur = conn.cursor()

# Fetch all accounts with their name_address_master data
cur.execute("""
    SELECT ap.accountno, ap.accounttype, ap.commissioncode,
           nam.name, nam.soc_ins
    FROM synth.account_profile ap
    JOIN synth.name_address_master nam ON nam.acct = ap.accountno
    ORDER BY ap.accountno
""")
rows = cur.fetchall()

# Commission rates for ~10% of accounts that have negotiated rates
# These are realistic Canadian brokerage discount rates
negotiated_rates = ["0.50", "0.75", "1.00", "1.25", "1.50"]

# Corporate account types — no SIN even if nam has one
# (LI = life insurance company, CA = corporation/association)
# All others are personal and keep their SIN from nam
CORP_TYPES = {"LI", "CA"}

updates = []
for accountno, accounttype, commissioncode, name, soc_ins in rows:
    # accountshname: up to 16 chars, already formatted well in nam
    shname = (name or "")[:16].strip()

    # regname: full name for registration, same source
    regname = (name or "")[:30].strip()

    # accountsin: blank for corporate types, use nam.soc_ins for personal
    if accounttype in CORP_TYPES:
        accountsin = ""
    else:
        accountsin = soc_ins or ""

    # commissionrate: 10% of accounts get a negotiated rate
    if random.random() < 0.10:
        commissionrate = random.choice(negotiated_rates)
    else:
        commissionrate = ""

    updates.append((shname, regname, accountsin, commissionrate, accountno))

# Bulk update
cur.executemany("""
    UPDATE synth.account_profile
    SET accountshname   = %s,
        regname         = %s,
        accountsin      = %s,
        commissionrate  = %s,
        _loaded_at      = now()
    WHERE accountno = %s
""", updates)

conn.commit()
print(f"Updated {len(updates)} rows in synth.account_profile")

# Sample output
cur.execute("""
    SELECT accountno, accounttype, accountshname, regname, accountsin, commissionrate
    FROM synth.account_profile
    ORDER BY accountno
    LIMIT 12
""")
rows = cur.fetchall()
print("\nSample rows:")
print(f"{'accountno':<14} {'type':<6} {'accountshname':<18} {'regname':<22} {'accountsin':<12} {'commrate'}")
print("-" * 90)
for r in rows:
    print(f"{r[0]:<14} {r[1]:<6} {r[2]:<18} {r[3]:<22} {r[4]:<12} {r[5]}")

# Stats
cur.execute("""
    SELECT
        count(*) FILTER (WHERE accountsin != '') as has_sin,
        count(*) FILTER (WHERE accountsin = '') as no_sin,
        count(*) FILTER (WHERE commissionrate != '') as has_commrate,
        count(*) FILTER (WHERE commissionrate = '') as no_commrate
    FROM synth.account_profile
""")
stats = cur.fetchone()
print(f"\nSINs populated: {stats[0]}, blank (corporate): {stats[1]}")
print(f"Negotiated commission rates: {stats[2]}, STD (blank): {stats[3]}")

cur.close()
conn.close()
