#!/usr/bin/env python3
"""
Update synth.security_master with realistic engsdesc, frsdesc, and symbol values.
Descriptions are generated based on sectype, secclass, payrate, expmatdt, country.
CUSIPs are replaced with realistic 9-char alphanumeric codes.
"""
import psycopg2
import random
import re

random.seed(42)

# ── Vocabulary pools ─────────────────────────────────────────────────────────

CDN_ISSUERS = [
    "ROYAL BANK", "TD BANK", "BANK OF MONTREAL", "SCOTIABANK", "CIBC",
    "NATIONAL BANK", "LAURENTIAN BANK", "CANADIAN TIRE", "BELL CANADA",
    "ROGERS COMM", "TELUS CORP", "ENBRIDGE INC", "SUNCOR ENERGY", "CENOVUS",
    "CNQ RESOURCES", "AGNICO EAGLE", "TECK RESOURCES", "BARRICK GOLD",
    "BROOKFIELD ASSET", "MANULIFE FINL", "GREAT WEST LIFE", "SUN LIFE FINL",
    "POWER CORP", "LOBLAW COS", "METRO INC", "EMPIRE CO", "DOLLARAMA",
    "CANADIAN NATL RLY", "CANADIAN PACIFIC", "AIR CANADA",
    "HYDRO ONE NETWKS", "FORTIS INC", "EMERA INC", "ALGONQUIN PWR",
    "WASTE CONNECTIONS", "OPEN TEXT CORP", "CGI GROUP INC",
    "ALIMENTATION CTM", "INTACT FINL CORP", "FAIRFAX FINL",
]

CDN_CORP_ISSUERS = [
    "ROYAL BANK", "TD BANK", "BANK OF MONTREAL", "SCOTIABANK", "CIBC",
    "BELL CANADA", "ROGERS COMM", "ENBRIDGE INC", "SUNCOR ENERGY",
    "CANADIAN TIRE", "MANULIFE FINL", "SUN LIFE FINL", "TELUS CORP",
    "LOBLAW COS", "HYDRO ONE NETWKS", "FORTIS INC", "AIR CANADA",
    "CANADIAN NATL RLY", "CANADIAN PACIFIC", "BROOKFIELD ASSET",
]

PROVINCIAL_ISSUERS = [
    "PROV OF ONTARIO", "PROV OF QUEBEC", "PROV OF BC",
    "PROV OF ALBERTA", "PROV OF MANITOBA", "PROV OF SASK",
    "PROV OF NOVA SCOTIA", "PROV OF NEW BRUNSWICK", "GOVT OF CANADA",
]

MUNICIPAL_ISSUERS = [
    "CITY OF TORONTO", "CITY OF MONTREAL", "CITY OF VANCOUVER",
    "CITY OF CALGARY", "CITY OF EDMONTON", "CITY OF OTTAWA",
    "CITY OF WINNIPEG", "CITY OF HAMILTON", "REGIONAL MUN PEEL",
    "REGIONAL MUN YORK",
]

US_ISSUERS = [
    "US TREASURY", "APPLE INC", "MICROSOFT CORP", "AMAZON COM INC",
    "ALPHABET INC", "JPMORGAN CHASE", "BERKSHIRE HATHWY",
    "JOHNSON JOHNSON", "EXXON MOBIL CORP", "CHEVRON CORP",
    "PROCTER GAMBLE", "COCA COLA CO", "PFIZER INC", "ABBOTT LABS",
    "UNITED HEALTH GRP", "HOME DEPOT INC", "WALMART INC", "VISA INC",
    "MASTERCARD INC", "BANK OF AMERICA",
]

CDN_FUNDS = [
    "CDN EQUITY FUND", "CDN BALANCED FUND", "CDN BOND FUND",
    "CDN GROWTH FUND", "CDN INCOME FUND", "CDN DIVIDEND FUND",
    "CDN SMALL CAP FUND", "CDN INDEX FUND", "CDN RESOURCE FUND",
    "CDN REAL ESTATE FUND", "CDN TECHNOLOGY FUND", "CDN HEALTH FUND",
    "CDN INTL EQUITY FUND", "CDN EMERGING MKTS FUND", "CDN MONEY MKT FUND",
    "CDN MORTGAGE FUND", "CDN SHORT TERM BOND", "CDN CORPORATE BOND",
    "CDN GLOBAL EQUITY", "CDN SECTOR ROTATION",
]

MONEY_MKT = [
    "CDN T-BILL 91 DAY", "CDN T-BILL 182 DAY", "CDN T-BILL 364 DAY",
    "BANKERS ACCEPTANCE", "COMMERCIAL PAPER", "TERM DEPOSIT CDN",
    "OVERNIGHT REPO CDN",
]

US_MONEY_MKT = [
    "US T-BILL 91 DAY", "US T-BILL 182 DAY", "US MONEY MKT FUND",
    "US DOLLAR DEPOSIT",
]

FR_ISSUERS = {
    "ROYAL BANK": "BANQUE ROYALE",
    "TD BANK": "BANQUE TD",
    "BANK OF MONTREAL": "BANQUE DE MONTREAL",
    "SCOTIABANK": "BANQUE SCOTIA",
    "CIBC": "CIBC",
    "NATIONAL BANK": "BANQUE NATIONALE",
    "LAURENTIAN BANK": "BANQUE LAURENTIENNE",
    "BELL CANADA": "BELL CANADA",
    "ROGERS COMM": "ROGERS COMM",
    "TELUS CORP": "TELUS CORP",
    "ENBRIDGE INC": "ENBRIDGE INC",
    "SUNCOR ENERGY": "SUNCOR ENERGIE",
    "CANADIAN NATL RLY": "CHEMIN DE FER CN",
    "CANADIAN PACIFIC": "CHEMIN DE FER CP",
    "AIR CANADA": "AIR CANADA",
    "MANULIFE FINL": "MANUVIE FINL",
    "SUN LIFE FINL": "SUN LIFE FINL",
    "HYDRO ONE NETWKS": "HYDRO ONE RESEAUX",
    "BROOKFIELD ASSET": "BROOKFIELD ACTIF",
    "LOBLAW COS": "LES COS LOBLAW",
    "METRO INC": "METRO INC",
    "FORTIS INC": "FORTIS INC",
    "PROV OF ONTARIO": "PROV DE L ONTARIO",
    "PROV OF QUEBEC": "PROV DU QUEBEC",
    "PROV OF BC": "PROV DE LA CB",
    "PROV OF ALBERTA": "PROV DE L ALBERTA",
    "PROV OF MANITOBA": "PROV DU MANITOBA",
    "PROV OF SASK": "PROV DE LA SASK",
    "PROV OF NOVA SCOTIA": "PROV DE LA NEP",
    "PROV OF NEW BRUNSWICK": "PROV DU NB",
    "GOVT OF CANADA": "GOUV DU CANADA",
    "CITY OF TORONTO": "VILLE DE TORONTO",
    "CITY OF MONTREAL": "VILLE DE MONTREAL",
    "CITY OF VANCOUVER": "VILLE DE VANCOUVER",
    "CITY OF CALGARY": "VILLE DE CALGARY",
    "CITY OF EDMONTON": "VILLE D EDMONTON",
    "CITY OF OTTAWA": "VILLE D OTTAWA",
    "CITY OF WINNIPEG": "VILLE DE WINNIPEG",
    "CITY OF HAMILTON": "VILLE DE HAMILTON",
    "REGIONAL MUN PEEL": "REGION MUN PEEL",
    "REGIONAL MUN YORK": "REGION MUN YORK",
}

CDN_EQUITY_SUFFIXES_EN = ["COM", "COM A", "COM B", "PFD A", "PFD B", "WRNTS", "RTS", "UTS"]
CDN_EQUITY_SUFFIXES_FR = ["ORD", "ORD A", "ORD B", "PREF A", "PREF B", "BONS S", "DR", "UC"]

# ── CUSIP generator ───────────────────────────────────────────────────────────
CUSIP_CHARS = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ"

def gen_cusip():
    return "".join(random.choices(CUSIP_CHARS, k=9))

# ── Ticker generator ──────────────────────────────────────────────────────────
def issuer_to_ticker(issuer: str, suffix: str = "") -> str:
    """Generate a plausible 2-4 char ticker from an issuer name."""
    words = issuer.strip().split()
    if len(words) >= 2:
        base = (words[0][0] + words[1][:2]).upper()
    else:
        base = words[0][:3].upper()
    base = re.sub(r'[^A-Z]', '', base)[:4]
    if suffix in ("PFD A", "PREF A", "PFD B", "PREF B"):
        base = base[:3] + ".PR"
    elif suffix in ("COM A", "ORD A"):
        base = base[:3] + ".A"
    elif suffix in ("WRNTS", "BONS S"):
        base = base[:3] + ".WT"
    return base[:6]

# ── Secclass → bond type mapping ──────────────────────────────────────────────
def classify_bond(secclass: str, sectype: str, country: str) -> tuple:
    """Return (issuer_pool, en_suffix, fr_suffix) based on secclass."""
    sc = secclass or ""
    if sc.startswith("14"):       # provincial/muni
        if sc in ("1411", "1415"):
            return PROVINCIAL_ISSUERS, "DEBEN", "DEBEN"
        return MUNICIPAL_ISSUERS, "DEBEN", "DEBEN"
    if sc.startswith("11"):       # govt/federal corp
        if sc in ("1111", "1112"):
            return CDN_CORP_ISSUERS, "SR DEBEN", "DEBEN SR"
        return (PROVINCIAL_ISSUERS if sectype == "260" else CDN_CORP_ISSUERS), "DEBEN", "DEBEN"
    if sc.startswith("12") or sc.startswith("13"):
        return CDN_CORP_ISSUERS, "MTG BOND", "OBL HYP"
    if sc.startswith("15"):
        return CDN_CORP_ISSUERS, "SR NOTE", "BILLET SR"
    if sc.startswith("6"):
        return CDN_ISSUERS, "FUND UNIT", "PART FOND"
    if sc.startswith("22") or sc.startswith("23"):
        return US_ISSUERS, "NOTE", "BILLET"
    return CDN_CORP_ISSUERS, "BOND", "OBL"

# ── Main description builder ──────────────────────────────────────────────────
def build_descriptions(secno, sectype, secclass, funds, payrate, expmatdt, country, indanndiv):
    st = (sectype or "").strip()
    sc = (secclass or "").strip()
    pr = (payrate or "").strip()
    mat = (expmatdt or "").strip()
    cty = (country or "CA").strip()

    # Parse maturity year for bond description
    mat_year = ""
    if mat:
        parts = mat.split("/")
        if len(parts) == 3:
            y = parts[2]
            mat_year = "20" + y if int(y) < 50 else "19" + y if len(y) == 2 else y

    coupon = f"{float(pr):.2f}" if pr else ""

    en, fr, symbol = "", "", ""

    # ── Bonds: 260, 263, 261, 262 ─────────────────────────────────────────────
    if st in ("260", "263", "261", "262"):
        issuer_pool, en_suf, fr_suf = classify_bond(sc, st, cty)
        issuer = random.choice(issuer_pool)
        fr_issuer = FR_ISSUERS.get(issuer, issuer)
        if coupon and mat_year:
            en = f"{issuer} {coupon}% {mat_year}"[:30]
            fr = f"{fr_issuer} {coupon}% {mat_year}"[:30]
        elif coupon:
            en = f"{issuer} {coupon}% {en_suf}"[:30]
            fr = f"{fr_issuer} {coupon}% {fr_suf}"[:30]
        else:
            en = f"{issuer} {en_suf}"[:30]
            fr = f"{fr_issuer} {fr_suf}"[:30]
        symbol = issuer_to_ticker(issuer, en_suf)

    # ── Debentures/Preferred: 310, 315, 295, 299 ─────────────────────────────
    elif st in ("310", "315", "295", "299"):
        issuer = random.choice(CDN_CORP_ISSUERS)
        fr_issuer = FR_ISSUERS.get(issuer, issuer)
        if st in ("310", "295"):
            suf_en, suf_fr = "PFD A", "PREF A"
        else:
            suf_en, suf_fr = "PFD B", "PREF B"
        if coupon:
            en = f"{issuer} {coupon}% {suf_en}"[:30]
            fr = f"{fr_issuer} {coupon}% {suf_fr}"[:30]
        else:
            en = f"{issuer} {suf_en}"[:30]
            fr = f"{fr_issuer} {suf_fr}"[:30]
        symbol = issuer_to_ticker(issuer, suf_en)

    # ── CDN Common Shares: 220, 230 ───────────────────────────────────────────
    elif st in ("220", "230"):
        issuer = random.choice(CDN_ISSUERS)
        fr_issuer = FR_ISSUERS.get(issuer, issuer)
        suf_en = random.choice(["COM", "COM A"])
        suf_fr = "ORD" if suf_en == "COM" else "ORD A"
        en = f"{issuer} {suf_en}"[:30]
        fr = f"{fr_issuer} {suf_fr}"[:30]
        symbol = issuer_to_ticker(issuer, suf_en)

    # ── US Common Shares: 330, 345 ────────────────────────────────────────────
    elif st in ("330", "345"):
        issuer = random.choice(US_ISSUERS)
        en = f"{issuer} COM"[:30]
        fr = f"{issuer} ORD"[:30]
        symbol = issuer_to_ticker(issuer)

    # ── CDN Mutual Funds: 380 ─────────────────────────────────────────────────
    elif st == "380":
        fund = random.choice(CDN_FUNDS)
        en = fund[:30]
        fr = (fund.replace("CDN", "FDS CDN")
                  .replace("FUND", "FONDS")
                  .replace("EQUITY", "ACTIONS")
                  .replace("BOND", "OBL")
                  .replace("MONEY MKT", "MARCH MON"))[:30]
        symbol = "MF" + fund.split()[1][:3]

    # ── CDN Money Market: 210 ─────────────────────────────────────────────────
    elif st == "210":
        desc = random.choice(MONEY_MKT)
        en = desc[:30]
        fr = (desc.replace("CDN T-BILL", "BON TRESOR CDN")
                  .replace("BANKERS ACCEPTANCE", "ACCEPT BANCAIRE")
                  .replace("COMMERCIAL PAPER", "BILLET DE TRESOR")
                  .replace("TERM DEPOSIT CDN", "DEPOT A TERME CDN")
                  .replace("OVERNIGHT REPO CDN", "MISE EN PENSION CDN"))[:30]
        symbol = "MM" + desc[:3]

    # ── US/Foreign Money Market: 900 ─────────────────────────────────────────
    elif st == "900":
        desc = random.choice(US_MONEY_MKT)
        en = desc[:30]
        fr = (desc.replace("US T-BILL", "BON TRESOR US")
                  .replace("US MONEY MKT FUND", "FONDS MARCH MON USD")
                  .replace("US DOLLAR DEPOSIT", "DEPOT EN DOLLARS US"))[:30]
        symbol = "USD" + desc[:3]

    # ── CDN Equity (secclass 3010): 240 ──────────────────────────────────────
    elif st == "240":
        issuer = random.choice(CDN_ISSUERS)
        fr_issuer = FR_ISSUERS.get(issuer, issuer)
        en = f"{issuer} COM"[:30]
        fr = f"{fr_issuer} ORD"[:30]
        symbol = issuer_to_ticker(issuer)

    # ── US Bonds / Foreign: 510, 520, 550 ────────────────────────────────────
    elif st in ("510", "520", "550"):
        issuer = random.choice(US_ISSUERS)
        if coupon and mat_year:
            en = f"{issuer} {coupon}% {mat_year}"[:30]
            fr = f"{issuer} {coupon}% {mat_year}"[:30]
        else:
            en = f"{issuer} NOTE"[:30]
            fr = f"{issuer} BILLET"[:30]
        symbol = issuer_to_ticker(issuer)

    # ── CDN Strip Bonds / Mortgage: 275 ──────────────────────────────────────
    elif st == "275":
        issuer = random.choice(PROVINCIAL_ISSUERS)
        fr_issuer = FR_ISSUERS.get(issuer, issuer)
        en = f"{issuer} STRIP {mat_year or 'BOND'}"[:30]
        fr = f"{fr_issuer} COUPON {mat_year or 'OBL'}"[:30]
        symbol = issuer_to_ticker(issuer)

    # ── Blank/Other ───────────────────────────────────────────────────────────
    else:
        if cty == "US":
            issuer = random.choice(US_ISSUERS)
            en = f"{issuer} SEC"[:30]
            fr = en
        else:
            issuer = random.choice(CDN_ISSUERS)
            en = f"{issuer} SEC"[:30]
            fr = (FR_ISSUERS.get(issuer, issuer) + " SEC")[:30]
        symbol = issuer_to_ticker(issuer)

    cusip = gen_cusip()
    return en.strip(), fr.strip(), symbol.strip(), cusip


# ── Run ───────────────────────────────────────────────────────────────────────
conn = psycopg2.connect(
    host="localhost", port=9432,
    dbname="ISM", user="ism_admin", password="ism_secret"
)
cur = conn.cursor()

cur.execute("""
    SELECT secno, sectype, secclass, funds, payrate, expmatdt, country, indanndiv
    FROM synth.security_master
    ORDER BY secno
""")
rows = cur.fetchall()

updates = []
for secno, sectype, secclass, funds, payrate, expmatdt, country, indanndiv in rows:
    en, fr, symbol, cusip = build_descriptions(
        secno, sectype, secclass, funds, payrate, expmatdt, country, indanndiv
    )
    updates.append((en, fr, symbol, cusip, secno))

cur.executemany("""
    UPDATE synth.security_master
    SET engsdesc  = %s,
        frsdesc   = %s,
        symbol    = %s,
        cusip     = %s,
        _loaded_at = now()
    WHERE secno = %s
""", updates)

conn.commit()
print(f"Updated {len(updates)} rows in synth.security_master")

# Sample
cur.execute("""
    SELECT secno, sectype, secclass, country, engsdesc, frsdesc, symbol, cusip
    FROM synth.security_master
    ORDER BY sectype, secno
    LIMIT 20
""")
print("\nSample rows:")
print(f"{'secno':<10} {'type':<5} {'cls':<5} {'cty':<4} {'engsdesc':<30} {'frsdesc':<30} {'symbol':<8} cusip")
print("-" * 110)
for r in cur.fetchall():
    print(f"{r[0]:<10} {r[1]:<5} {r[2]:<5} {r[3]:<4} {r[4]:<30} {r[5]:<30} {r[6]:<8} {r[7]}")

# Stats
cur.execute("""
    SELECT
        count(*) FILTER (WHERE engsdesc NOT LIKE 'Synthetic%') as real_en,
        count(*) FILTER (WHERE symbol NOT LIKE 'SYM%') as real_symbol,
        count(*) FILTER (WHERE cusip NOT LIKE 'CUSIP%') as real_cusip
    FROM synth.security_master
""")
s = cur.fetchone()
print(f"\nReal English desc: {s[0]}, Real symbols: {s[1]}, Real CUSIPs: {s[2]}")

cur.close()
conn.close()
