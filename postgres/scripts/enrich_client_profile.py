#!/usr/bin/env python3
"""
Update synth.client_profile with realistic names, phone, SIN, language,
branch, spouse names, and employers derived from name_address_master
and account_profile.
"""
import psycopg2
import random

random.seed(99)

# Corporate account types — no SIN, no spouse, no employer
CORP_TYPES = {"LI", "CA"}

# Occupation codes where an employer makes sense
# (not retired=07, not student=09, not other/unemployed=08)
EMPLOYED_OCCUPATIONS = {"01", "02", "03", "04", "05", "06", "10"}

# Realistic Canadian employers by occupation
EMPLOYERS = {
    "01": [  # Professional
        "MCMILLAN LLP", "BLAKE CASSELS", "DELOITTE CANADA", "KPMG LLP",
        "FASKEN MARTINEAU", "MCCARTHY TETRAULT", "ERNST & YOUNG LLP",
        "BORDEN LADNER GERVAIS", "BENNETT JONES LLP", "OSLER HOSKIN",
    ],
    "02": [  # Senior Management
        "ROYAL BANK OF CANADA", "TD BANK GROUP", "SCOTIABANK",
        "BOMBARDIER INC", "MANULIFE FINANCIAL", "SNC-LAVALIN GROUP",
        "POWER CORPORATION", "EMPIRE COMPANY LTD", "LOBLAW COMPANIES",
        "GEORGE WESTON LTD",
    ],
    "03": [  # Middle Management
        "SUN LIFE FINANCIAL", "GREAT-WEST LIFECO", "CANADA POST",
        "BELL CANADA", "ROGERS COMMUNICATIONS", "TELUS CORPORATION",
        "SHAW COMMUNICATIONS", "HYDRO ONE NETWORKS", "ENBRIDGE INC",
        "CANADIAN NATIONAL RLY",
    ],
    "04": [  # Skilled Trades / Technical
        "STANTEC INC", "WSP GLOBAL INC", "AECOM CANADA LTD",
        "PCL CONSTRUCTORS INC", "ELLIS DON CORPORATION", "BIRD CONSTRUCTION",
        "TECK RESOURCES LTD", "AGNICO EAGLE MINES", "FIRST QUANTUM MIN",
        "CAMECO CORPORATION",
    ],
    "05": [  # Sales / Service
        "CANADIAN TIRE CORP", "DOLLARAMA INC", "METRO INC",
        "SAPUTO INC", "ALIMENTATION COUCHE", "HUDSON BAY COMPANY",
        "CANADIAN NATURAL RES", "SUNCOR ENERGY INC", "CENOVUS ENERGY",
        "INTACT FINANCIAL CORP",
    ],
    "06": [  # Administrative
        "GOVERNMENT OF CANADA", "PROVINCE OF ONTARIO", "CITY OF TORONTO",
        "PROVINCE OF QUEBEC", "PROVINCE OF BC", "CITY OF MONTREAL",
        "PROVINCE OF ALBERTA", "UNIVERSITY OF TORONTO", "MCGILL UNIVERSITY",
        "YORK UNIVERSITY",
    ],
    "10": [  # Business Owner / Self-employed
        "SELF EMPLOYED", "INDEPENDENT CONSULT", "SOLE PROPRIETOR",
        "FREELANCE SERVICES", "INDEPENDENT ADVISOR",
    ],
}

# English first initials (common) for spouse name generation
EN_INITIALS = list("ACDEFGHJKLMNPRST")
FR_INITIALS = list("ACDEFGHJKLMNPRST")

def spouse_name(client_name: str, lang: str) -> str:
    """Generate a spouse name in 'SURNAME INITIAL' format."""
    parts = client_name.strip().split()
    if not parts:
        return ""
    surname = parts[0]
    # Pick a different initial than the client
    client_initial = parts[1][0] if len(parts) > 1 else "A"
    pool = FR_INITIALS if lang == "F" else EN_INITIALS
    options = [i for i in pool if i != client_initial]
    initial = random.choice(options) if options else random.choice(pool)
    return f"{surname} {initial}"

conn = psycopg2.connect(
    host="localhost", port=9432,
    dbname="ISM", user="ism_admin", password="ism_secret"
)
cur = conn.cursor()

# Fetch everything needed in one query
cur.execute("""
    SELECT cp.clientno,
           ap.accounttype,
           ap.branchno,
           nam.name,
           nam.phone,
           nam.soc_ins,
           nam.lang_ind,
           cp.maritalstatus,
           cp.occupation
    FROM synth.client_profile cp
    JOIN synth.client_account_links cal
         ON cal.client_no = cp.clientno AND cal.relation_type = 'PRIMARY'
    JOIN synth.account_profile ap
         ON ap.accountno = cal.account_no
    JOIN synth.name_address_master nam
         ON nam.acct = cal.account_no
    ORDER BY cp.clientno
""")
rows = cur.fetchall()

updates = []
for (clientno, accounttype, branchno, name, phone, soc_ins,
     lang_ind, maritalstatus, occupation) in rows:

    is_personal = accounttype not in CORP_TYPES

    # clientshname: up to 16 chars
    clientshname = (name or "")[:16].strip()

    # telephone from nam
    telephone = phone or ""

    # sin: personal types only
    sin = (soc_ins or "") if is_personal else ""

    # language: from nam lang_ind
    language = lang_ind if lang_ind in ("E", "F") else "E"

    # branch: from account_profile
    branch = branchno or "00000000"

    # spousename: married personal clients only
    if is_personal and maritalstatus == "M" and name:
        spousename = spouse_name(name, language)
    else:
        spousename = ""

    # employer: employed personal clients only
    employer = ""
    if is_personal and occupation in EMPLOYED_OCCUPATIONS:
        pool = EMPLOYERS.get(occupation, EMPLOYERS["06"])
        employer = random.choice(pool)

    updates.append((
        clientshname, telephone, sin, language, branch,
        spousename, employer, clientno
    ))

cur.executemany("""
    UPDATE synth.client_profile
    SET clientshname = %s,
        telephone    = %s,
        sin          = %s,
        language     = %s,
        branch       = %s,
        spousename   = %s,
        employer     = %s,
        _loaded_at   = now()
    WHERE clientno = %s
""", updates)

conn.commit()
print(f"Updated {len(updates)} rows in synth.client_profile")

# Sample output
cur.execute("""
    SELECT clientno, language, clientshname, telephone, sin, branch, spousename, employer
    FROM synth.client_profile
    ORDER BY clientno
    LIMIT 15
""")
print("\nSample rows:")
print(f"{'clientno':<12} {'lang':<5} {'clientshname':<18} {'telephone':<14} {'sin':<12} {'branch':<9} {'spousename':<16} employer")
print("-" * 110)
for r in cur.fetchall():
    print(f"{r[0]:<12} {r[1]:<5} {r[2]:<18} {r[3]:<14} {r[4]:<12} {r[5]:<9} {r[6]:<16} {r[7]}")

# Stats
cur.execute("""
    SELECT
        count(*) FILTER (WHERE clientshname NOT LIKE 'CL%') as real_names,
        count(*) FILTER (WHERE telephone != '') as has_phone,
        count(*) FILTER (WHERE sin != '') as has_sin,
        count(*) FILTER (WHERE language = 'F') as french,
        count(*) FILTER (WHERE branch != '00000000') as real_branch,
        count(*) FILTER (WHERE spousename != '') as has_spouse,
        count(*) FILTER (WHERE employer != '') as has_employer
    FROM synth.client_profile
""")
s = cur.fetchone()
print(f"\nReal names: {s[0]}, Has phone: {s[1]}, Has SIN: {s[2]}, French: {s[3]}")
print(f"Real branch: {s[4]}, Has spouse: {s[5]}, Has employer: {s[6]}")

cur.close()
conn.close()
