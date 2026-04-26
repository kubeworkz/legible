BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 105_enrich_synth_profiles.sql
--
-- Enriches stub fields in three synth tables with realistic synthetic data,
-- derived from synth.name_address_master (names, phones, SINs, language)
-- and synth.account_profile (branches, account types).
--
-- Tables updated:
--   synth.account_profile  — accountshname, regname, accountsin, commissionrate
--   synth.client_profile   — clientshname, telephone, sin, language, branch,
--                            spousename, employer
--   synth.security_master  — engsdesc, frsdesc, symbol, cusip
--
-- Prerequisites: 101_build_synth.sql, 102_build_synth_accounts_clients.sql,
--                103_build_synth_expanded.sql, 104_build_synth_raw_tables.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── account_profile ──────────────────────────────────────────────────────────
-- Pull name and SIN from name_address_master; set commissionrate for ~10% of
-- accounts (negotiated rates 0.50–1.50); blank for STD-schedule accounts.
-- Corporate types (CA, LI) never receive a SIN.

UPDATE synth.account_profile ap
SET accountshname  = left(nam.name, 16),
    regname        = left(nam.name, 30),
    accountsin     = CASE
                         WHEN ap.accounttype IN ('CA', 'LI') THEN ''
                         ELSE coalesce(nam.soc_ins, '')
                     END,
    -- ~10% get a negotiated commission rate (deterministic via hashtext)
    commissionrate = CASE
                         WHEN abs(hashtext(ap.accountno)) % 10 = 0
                         THEN (array['0.50','0.75','1.00','1.25','1.50'])
                              [1 + (abs(hashtext(ap.accountno || 'cr')) % 5)]
                         ELSE ''
                     END,
    _loaded_at     = now()
FROM synth.name_address_master nam
WHERE nam.acct = ap.accountno;

-- ── client_profile ───────────────────────────────────────────────────────────
-- Pull name, phone, SIN, language from name_address_master via the primary
-- account link; branch from account_profile.
-- Spouse name generated for married personal clients (same surname, different
-- initial).  Employer set for working-age occupation codes.

UPDATE synth.client_profile cp
SET clientshname = left(nam.name, 16),
    telephone    = coalesce(nam.phone, ''),
    sin          = CASE
                       WHEN ap.accounttype IN ('CA', 'LI') THEN ''
                       ELSE coalesce(nam.soc_ins, '')
                   END,
    language     = CASE
                       WHEN nam.lang_ind IN ('E', 'F') THEN nam.lang_ind
                       ELSE 'E'
                   END,
    branch       = coalesce(ap.branchno, '00000000'),
    -- Spouse: married personal clients get "SURNAME X" where X ≠ client initial
    spousename   = CASE
                       WHEN cp.maritalstatus = 'M'
                            AND ap.accounttype NOT IN ('CA', 'LI')
                            AND nam.name IS NOT NULL
                       THEN split_part(nam.name, ' ', 1) || ' '
                            || chr(65 + ((abs(hashtext(nam.name || 'sp')) % 19) + 1))
                       ELSE ''
                   END,
    -- Employer: occupation codes for employed/professional (01–06, 10)
    employer     = CASE
                       WHEN ap.accounttype NOT IN ('CA', 'LI')
                            AND cp.occupation IN ('01','02','03','04','05','06','10')
                       THEN (array[
                           'ROYAL BANK OF CANADA','TD BANK GROUP','SCOTIABANK',
                           'BELL CANADA','ROGERS COMMUNICATIONS','TELUS CORPORATION',
                           'ENBRIDGE INC','SUNCOR ENERGY INC','GOVERNMENT OF CANADA',
                           'PROVINCE OF ONTARIO','PROVINCE OF QUEBEC','PROVINCE OF BC',
                           'CITY OF TORONTO','CITY OF MONTREAL','UNIVERSITY OF TORONTO',
                           'MCGILL UNIVERSITY','DELOITTE CANADA','KPMG LLP',
                           'STANTEC INC','CANADIAN NATIONAL RLY','CANADIAN PACIFIC',
                           'MANULIFE FINANCIAL','SUN LIFE FINANCIAL','INTACT FINL CORP',
                           'LOBLAW COMPANIES','BOMBARDIER INC','SNC-LAVALIN GROUP',
                           'SELF EMPLOYED','INDEPENDENT CONSULT','FREELANCE SERVICES'
                       ])[1 + (abs(hashtext(cp.clientno || 'emp')) % 30)]
                       ELSE ''
                   END,
    _loaded_at   = now()
FROM synth.client_account_links cal
JOIN synth.account_profile ap  ON ap.accountno  = cal.account_no
JOIN synth.name_address_master nam ON nam.acct   = cal.account_no
WHERE cal.client_no     = cp.clientno
  AND cal.relation_type = 'PRIMARY';

-- ── security_master — descriptions, symbols, CUSIPs ─────────────────────────
-- Descriptions are type-aware:
--   260/263/261/262  CDN bonds    → ISSUER COUPON% YEAR
--   310/315/295/299  CDN prefs    → ISSUER COUPON% PFD A/B
--   220/230          CDN equity   → ISSUER COM/COM A
--   330/345          US equity    → ISSUER COM
--   380              Mutual fund  → CDN <TYPE> FUND
--   210              CDN MM       → T-BILL / BA / REPO descriptions
--   900              USD MM       → US T-BILL / USD DEPOSIT descriptions
--
-- CUSIPs are replaced with random 9-char alphanumeric values.
-- The description arrays below match the Python generation script output.

UPDATE synth.security_master sm
SET engsdesc = CASE
    -- CDN / US bonds with coupon + maturity
    WHEN sm.sectype IN ('260','263','261','262','310','315','295','299')
         AND sm.payrate <> '' AND sm.expmatdt <> ''
    THEN left(
        (array[
            'ROYAL BANK','TD BANK','BANK OF MONTREAL','SCOTIABANK','CIBC',
            'BELL CANADA','ROGERS COMM','ENBRIDGE INC','SUNCOR ENERGY',
            'PROV OF ONTARIO','PROV OF QUEBEC','GOVT OF CANADA',
            'HYDRO ONE NETWKS','MANULIFE FINL','SUN LIFE FINL',
            'CANADIAN NATL RLY','CANADIAN PACIFIC','LOBLAW COS',
            'TELUS CORP','FORTIS INC'
        ])[1 + (abs(hashtext(sm.secno)) % 20)]
        || ' ' || sm.payrate || '% '
        || right(split_part(sm.expmatdt, '/', 3), 4),
        30)
    -- CDN bonds without maturity
    WHEN sm.sectype IN ('260','263','261','262')
    THEN left(
        (array[
            'ROYAL BANK','TD BANK','BANK OF MONTREAL','SCOTIABANK','CIBC',
            'BELL CANADA','ROGERS COMM','ENBRIDGE INC','SUNCOR ENERGY',
            'PROV OF ONTARIO','PROV OF QUEBEC','GOVT OF CANADA',
            'HYDRO ONE NETWKS','MANULIFE FINL','SUN LIFE FINL',
            'CANADIAN NATL RLY','CANADIAN PACIFIC','LOBLAW COS',
            'TELUS CORP','FORTIS INC'
        ])[1 + (abs(hashtext(sm.secno)) % 20)]
        || ' DEBEN',
        30)
    -- CDN preferreds
    WHEN sm.sectype IN ('310','295')
    THEN left(
        (array[
            'ROYAL BANK','TD BANK','SCOTIABANK','CIBC','BELL CANADA',
            'ROGERS COMM','ENBRIDGE INC','SUNCOR ENERGY','MANULIFE FINL',
            'SUN LIFE FINL','TELUS CORP','LOBLAW COS','HYDRO ONE NETWKS',
            'FORTIS INC','CANADIAN TIRE'
        ])[1 + (abs(hashtext(sm.secno)) % 15)]
        || CASE WHEN sm.payrate <> '' THEN ' ' || sm.payrate || '% PFD A' ELSE ' PFD A' END,
        30)
    WHEN sm.sectype IN ('315','299')
    THEN left(
        (array[
            'ROYAL BANK','TD BANK','SCOTIABANK','CIBC','BELL CANADA',
            'ROGERS COMM','ENBRIDGE INC','SUNCOR ENERGY','MANULIFE FINL',
            'SUN LIFE FINL','TELUS CORP','LOBLAW COS','HYDRO ONE NETWKS',
            'FORTIS INC','CANADIAN TIRE'
        ])[1 + (abs(hashtext(sm.secno)) % 15)]
        || CASE WHEN sm.payrate <> '' THEN ' ' || sm.payrate || '% PFD B' ELSE ' PFD B' END,
        30)
    -- CDN common shares
    WHEN sm.sectype IN ('220','230','240')
    THEN left(
        (array[
            'ROYAL BANK','TD BANK','BANK OF MONTREAL','SCOTIABANK','CIBC',
            'NATIONAL BANK','BELL CANADA','ROGERS COMM','TELUS CORP',
            'ENBRIDGE INC','SUNCOR ENERGY','AGNICO EAGLE','TECK RESOURCES',
            'BROOKFIELD ASSET','MANULIFE FINL','SUN LIFE FINL','LOBLAW COS',
            'CANADIAN NATL RLY','CANADIAN PACIFIC','DOLLARAMA',
            'HYDRO ONE NETWKS','FORTIS INC','CANADIAN TIRE','METRO INC',
            'EMPIRE CO','ALGONQUIN PWR','POWER CORP','INTACT FINL CORP',
            'OPEN TEXT CORP','CGI GROUP INC'
        ])[1 + (abs(hashtext(sm.secno)) % 30)]
        || CASE WHEN abs(hashtext(sm.secno || 'cls')) % 4 = 0 THEN ' COM A' ELSE ' COM' END,
        30)
    -- US common shares
    WHEN sm.sectype IN ('330','345')
    THEN left(
        (array[
            'APPLE INC','MICROSOFT CORP','AMAZON COM INC','ALPHABET INC',
            'JPMORGAN CHASE','BERKSHIRE HATHWY','JOHNSON JOHNSON',
            'EXXON MOBIL CORP','CHEVRON CORP','PROCTER GAMBLE',
            'COCA COLA CO','PFIZER INC','ABBOTT LABS','UNITED HEALTH GRP',
            'HOME DEPOT INC','WALMART INC','VISA INC','MASTERCARD INC',
            'BANK OF AMERICA','US TREASURY'
        ])[1 + (abs(hashtext(sm.secno)) % 20)]
        || ' COM',
        30)
    -- US bonds
    WHEN sm.sectype IN ('510','520','550')
    THEN left(
        (array[
            'APPLE INC','MICROSOFT CORP','JPMORGAN CHASE','EXXON MOBIL CORP',
            'PROCTER GAMBLE','COCA COLA CO','US TREASURY','BANK OF AMERICA'
        ])[1 + (abs(hashtext(sm.secno)) % 8)]
        || CASE WHEN sm.payrate <> '' AND sm.expmatdt <> ''
                THEN ' ' || sm.payrate || '% ' || right(split_part(sm.expmatdt,'/',3),4)
                ELSE ' NOTE' END,
        30)
    -- Mutual funds
    WHEN sm.sectype = '380'
    THEN (array[
        'CDN EQUITY FUND','CDN BALANCED FUND','CDN BOND FUND',
        'CDN GROWTH FUND','CDN INCOME FUND','CDN DIVIDEND FUND',
        'CDN SMALL CAP FUND','CDN INDEX FUND','CDN RESOURCE FUND',
        'CDN REAL ESTATE FUND','CDN TECHNOLOGY FUND','CDN HEALTH FUND',
        'CDN INTL EQUITY FUND','CDN EMERGING MKTS FUND','CDN MONEY MKT FUND',
        'CDN MORTGAGE FUND','CDN SHORT TERM BOND','CDN CORPORATE BOND',
        'CDN GLOBAL EQUITY','CDN SECTOR ROTATION'
    ])[1 + (abs(hashtext(sm.secno)) % 20)]
    -- CDN money market
    WHEN sm.sectype = '210'
    THEN (array[
        'CDN T-BILL 91 DAY','CDN T-BILL 182 DAY','CDN T-BILL 364 DAY',
        'BANKERS ACCEPTANCE','COMMERCIAL PAPER','TERM DEPOSIT CDN',
        'OVERNIGHT REPO CDN'
    ])[1 + (abs(hashtext(sm.secno)) % 7)]
    -- USD money market
    WHEN sm.sectype = '900'
    THEN (array[
        'US T-BILL 91 DAY','US T-BILL 182 DAY',
        'US MONEY MKT FUND','US DOLLAR DEPOSIT'
    ])[1 + (abs(hashtext(sm.secno)) % 4)]
    ELSE left(
        (array[
            'ROYAL BANK','TD BANK','SCOTIABANK','BELL CANADA','ENBRIDGE INC'
        ])[1 + (abs(hashtext(sm.secno)) % 5)]
        || ' SEC',
        30)
END,

frsdesc = CASE
    WHEN sm.sectype IN ('260','263','261','262')
         AND sm.payrate <> '' AND sm.expmatdt <> ''
    THEN left(
        (array[
            'BANQUE ROYALE','BANQUE TD','BANQUE DE MONTREAL','BANQUE SCOTIA','CIBC',
            'BELL CANADA','ROGERS COMM','ENBRIDGE INC','SUNCOR ENERGIE',
            'PROV DE L ONTARIO','PROV DU QUEBEC','GOUV DU CANADA',
            'HYDRO ONE RESEAUX','MANUVIE FINL','SUN LIFE FINL',
            'CHEMIN DE FER CN','CHEMIN DE FER CP','LES COS LOBLAW',
            'TELUS CORP','FORTIS INC'
        ])[1 + (abs(hashtext(sm.secno)) % 20)]
        || ' ' || sm.payrate || '% '
        || right(split_part(sm.expmatdt, '/', 3), 4),
        30)
    WHEN sm.sectype IN ('260','263','261','262')
    THEN left(
        (array[
            'BANQUE ROYALE','BANQUE TD','BANQUE DE MONTREAL','BANQUE SCOTIA','CIBC',
            'BELL CANADA','ROGERS COMM','ENBRIDGE INC','SUNCOR ENERGIE',
            'PROV DE L ONTARIO','PROV DU QUEBEC','GOUV DU CANADA',
            'HYDRO ONE RESEAUX','MANUVIE FINL','SUN LIFE FINL',
            'CHEMIN DE FER CN','CHEMIN DE FER CP','LES COS LOBLAW',
            'TELUS CORP','FORTIS INC'
        ])[1 + (abs(hashtext(sm.secno)) % 20)]
        || ' DEBEN',
        30)
    WHEN sm.sectype IN ('310','295')
    THEN left(
        (array[
            'BANQUE ROYALE','BANQUE TD','BANQUE SCOTIA','CIBC','BELL CANADA',
            'ROGERS COMM','ENBRIDGE INC','SUNCOR ENERGIE','MANUVIE FINL',
            'SUN LIFE FINL','TELUS CORP','LES COS LOBLAW','HYDRO ONE RESEAUX',
            'FORTIS INC','CANADIAN TIRE'
        ])[1 + (abs(hashtext(sm.secno)) % 15)]
        || CASE WHEN sm.payrate <> '' THEN ' ' || sm.payrate || '% PREF A' ELSE ' PREF A' END,
        30)
    WHEN sm.sectype IN ('315','299')
    THEN left(
        (array[
            'BANQUE ROYALE','BANQUE TD','BANQUE SCOTIA','CIBC','BELL CANADA',
            'ROGERS COMM','ENBRIDGE INC','SUNCOR ENERGIE','MANUVIE FINL',
            'SUN LIFE FINL','TELUS CORP','LES COS LOBLAW','HYDRO ONE RESEAUX',
            'FORTIS INC','CANADIAN TIRE'
        ])[1 + (abs(hashtext(sm.secno)) % 15)]
        || CASE WHEN sm.payrate <> '' THEN ' ' || sm.payrate || '% PREF B' ELSE ' PREF B' END,
        30)
    WHEN sm.sectype IN ('220','230','240')
    THEN left(
        (array[
            'BANQUE ROYALE','BANQUE TD','BANQUE DE MONTREAL','BANQUE SCOTIA','CIBC',
            'BANQUE NATIONALE','BELL CANADA','ROGERS COMM','TELUS CORP',
            'ENBRIDGE INC','SUNCOR ENERGIE','AGNICO EAGLE','TECK RESOURCES',
            'BROOKFIELD ACTIF','MANUVIE FINL','SUN LIFE FINL','LES COS LOBLAW',
            'CHEMIN DE FER CN','CHEMIN DE FER CP','DOLLARAMA',
            'HYDRO ONE RESEAUX','FORTIS INC','CANADIAN TIRE','METRO INC',
            'EMPIRE CO','ALGONQUIN PWR','POWER CORP','INTACT FINL CORP',
            'OPEN TEXT CORP','CGI GROUP INC'
        ])[1 + (abs(hashtext(sm.secno)) % 30)]
        || CASE WHEN abs(hashtext(sm.secno || 'cls')) % 4 = 0 THEN ' ORD A' ELSE ' ORD' END,
        30)
    WHEN sm.sectype IN ('330','345')
    THEN left(
        (array[
            'APPLE INC','MICROSOFT CORP','AMAZON COM INC','ALPHABET INC',
            'JPMORGAN CHASE','BERKSHIRE HATHWY','JOHNSON JOHNSON',
            'EXXON MOBIL CORP','CHEVRON CORP','PROCTER GAMBLE',
            'COCA COLA CO','PFIZER INC','ABBOTT LABS','UNITED HEALTH GRP',
            'HOME DEPOT INC','WALMART INC','VISA INC','MASTERCARD INC',
            'BANK OF AMERICA','US TREASURY'
        ])[1 + (abs(hashtext(sm.secno)) % 20)]
        || ' ORD',
        30)
    WHEN sm.sectype IN ('510','520','550')
    THEN left(
        (array[
            'APPLE INC','MICROSOFT CORP','JPMORGAN CHASE','EXXON MOBIL CORP',
            'PROCTER GAMBLE','COCA COLA CO','US TREASURY','BANK OF AMERICA'
        ])[1 + (abs(hashtext(sm.secno)) % 8)]
        || CASE WHEN sm.payrate <> '' AND sm.expmatdt <> ''
                THEN ' ' || sm.payrate || '% ' || right(split_part(sm.expmatdt,'/',3),4)
                ELSE ' BILLET' END,
        30)
    WHEN sm.sectype = '380'
    THEN replace(replace(replace(replace(
        (array[
            'CDN EQUITY FUND','CDN BALANCED FUND','CDN BOND FUND',
            'CDN GROWTH FUND','CDN INCOME FUND','CDN DIVIDEND FUND',
            'CDN SMALL CAP FUND','CDN INDEX FUND','CDN RESOURCE FUND',
            'CDN REAL ESTATE FUND','CDN TECHNOLOGY FUND','CDN HEALTH FUND',
            'CDN INTL EQUITY FUND','CDN EMERGING MKTS FUND','CDN MONEY MKT FUND',
            'CDN MORTGAGE FUND','CDN SHORT TERM BOND','CDN CORPORATE BOND',
            'CDN GLOBAL EQUITY','CDN SECTOR ROTATION'
        ])[1 + (abs(hashtext(sm.secno)) % 20)],
        'FUND','FONDS'),'EQUITY','ACTIONS'),'BOND','OBL'),'MONEY MKT','MARCH MON')
    WHEN sm.sectype = '210'
    THEN replace(replace(replace(replace(replace(
        (array[
            'CDN T-BILL 91 DAY','CDN T-BILL 182 DAY','CDN T-BILL 364 DAY',
            'BANKERS ACCEPTANCE','COMMERCIAL PAPER','TERM DEPOSIT CDN',
            'OVERNIGHT REPO CDN'
        ])[1 + (abs(hashtext(sm.secno)) % 7)],
        'CDN T-BILL','BON TRESOR CDN'),
        'BANKERS ACCEPTANCE','ACCEPT BANCAIRE'),
        'COMMERCIAL PAPER','BILLET DE TRESOR'),
        'TERM DEPOSIT CDN','DEPOT A TERME CDN'),
        'OVERNIGHT REPO CDN','MISE EN PENSION CDN')
    WHEN sm.sectype = '900'
    THEN replace(replace(replace(
        (array[
            'US T-BILL 91 DAY','US T-BILL 182 DAY',
            'US MONEY MKT FUND','US DOLLAR DEPOSIT'
        ])[1 + (abs(hashtext(sm.secno)) % 4)],
        'US T-BILL','BON TRESOR US'),
        'US MONEY MKT FUND','FONDS MARCH MON USD'),
        'US DOLLAR DEPOSIT','DEPOT EN DOLLARS US')
    ELSE left(
        (array[
            'BANQUE ROYALE','BANQUE TD','BANQUE SCOTIA','BELL CANADA','ENBRIDGE INC'
        ])[1 + (abs(hashtext(sm.secno)) % 5)]
        || ' SEC',
        30)
END,

symbol = left(upper(regexp_replace(engsdesc, '[^A-Z0-9]', '', 'g')), 5),

cusip  = upper(
    substring(md5(sm.secno || 'cusip2026'), 1, 9)
),

_loaded_at = now();

COMMIT;
