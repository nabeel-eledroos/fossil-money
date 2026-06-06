-- ============================================================================
-- Fossil Money — Schema v2 migration
-- Extends the v1 schema (politicians / donations / lcv_scores / summaries /
-- homepage_stats / zip_to_district) to support every feature in the mockup:
-- multi-level officials, % of funding, sub-industry + PAC/individual splits,
-- outside/dark money, the votes behind the LCV score, lobbying, personal
-- fossil holdings, committee leverage, district infrastructure stakes,
-- election context, the pledge (signed/none/broke), full provenance, and a
-- read-optimized summary the API can serve in a single query.
--
-- Safe to run on top of v1: uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS and
-- is non-destructive (old columns are kept and marked deprecated).
-- Run in the Supabase SQL editor (Postgres 15+).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Geographic backbone: Open Civic Data divisions (federal → local)
--    A "division" is any geography that elects an official (a US House district,
--    a state-senate district, a county, a city-council ward, etc.). This is what
--    lets us go below Congress. Officials hang off a division; so does the
--    fossil infrastructure physically located in it.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS divisions (
  ocd_id          TEXT PRIMARY KEY,                       -- ocd-division/country:us/state:tx/cd:12
  level           TEXT NOT NULL CHECK (level IN ('federal','state','local')),
  division_type   TEXT NOT NULL,                          -- us_senate, us_house, state_upper, state_lower,
                                                           -- governor, county, municipality, council_district...
  name            TEXT NOT NULL,
  state           VARCHAR(2),
  parent_ocd_id   TEXT REFERENCES divisions(ocd_id),
  -- geom GEOMETRY(MultiPolygon,4326),   -- enable PostGIS for point-in-polygon district matching
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Many-to-many ZIP → division. A single ZIP routinely spans multiple districts,
-- so this is the COARSE fallback; prefer address-level geocoding at request time.
CREATE TABLE IF NOT EXISTS zip_to_division (
  zip_code         VARCHAR(5) NOT NULL,
  ocd_id           TEXT NOT NULL REFERENCES divisions(ocd_id) ON DELETE CASCADE,
  match_confidence NUMERIC(4,3) DEFAULT 1.0,              -- share of ZIP population in this division
  source           TEXT DEFAULT 'census-zcta-crosswalk',
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (zip_code, ocd_id)
);
CREATE INDEX IF NOT EXISTS idx_zip_div_zip ON zip_to_division(zip_code);

-- ----------------------------------------------------------------------------
-- 1. politicians — generalize to all levels + add denominator, election context,
--    richer pledge state, and external IDs for state/local lookups.
-- ----------------------------------------------------------------------------
ALTER TABLE politicians ADD COLUMN IF NOT EXISTS level            TEXT
  CHECK (level IN ('federal','state','local')) DEFAULT 'federal';
ALTER TABLE politicians ADD COLUMN IF NOT EXISTS office_type      TEXT;      -- us_senate, us_house, governor,
                                                                             -- state_upper, state_lower, mayor,
                                                                             -- city_council, county_commission...
ALTER TABLE politicians ADD COLUMN IF NOT EXISTS ocd_division_id  TEXT REFERENCES divisions(ocd_id);
ALTER TABLE politicians ADD COLUMN IF NOT EXISTS openstates_id    TEXT;      -- state legislators (Open States)
ALTER TABLE politicians ADD COLUMN IF NOT EXISTS cicero_id        TEXT;      -- local officials (Cicero)
ALTER TABLE politicians ADD COLUMN IF NOT EXISTS bio              TEXT;
ALTER TABLE politicians ADD COLUMN IF NOT EXISTS total_raised     NUMERIC(14,2) DEFAULT 0;  -- % of funding denominator
ALTER TABLE politicians ADD COLUMN IF NOT EXISTS incumbent        BOOLEAN DEFAULT TRUE;
-- election context
ALTER TABLE politicians ADD COLUMN IF NOT EXISTS term_start       DATE;
ALTER TABLE politicians ADD COLUMN IF NOT EXISTS next_election     DATE;
ALTER TABLE politicians ADD COLUMN IF NOT EXISTS up_this_cycle    BOOLEAN DEFAULT FALSE;
ALTER TABLE politicians ADD COLUMN IF NOT EXISTS last_margin      TEXT;
-- pledge: replace the v1 boolean (kept, deprecated) with a 3-state status
ALTER TABLE politicians ADD COLUMN IF NOT EXISTS pledge_status    TEXT
  CHECK (pledge_status IN ('signed','none','broke','unknown')) DEFAULT 'unknown';
ALTER TABLE politicians ADD COLUMN IF NOT EXISTS pledge_signed_date DATE;
ALTER TABLE politicians ADD COLUMN IF NOT EXISTS pledge_source_url  TEXT;
-- backfill pledge_status from the old boolean if present
UPDATE politicians
  SET pledge_status = CASE WHEN signed_nffm_pledge IS TRUE THEN 'signed' ELSE 'unknown' END
  WHERE pledge_status = 'unknown' AND signed_nffm_pledge IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_politicians_level   ON politicians(level);
CREATE INDEX IF NOT EXISTS idx_politicians_div     ON politicians(ocd_division_id);
CREATE INDEX IF NOT EXISTS idx_politicians_pledge  ON politicians(pledge_status);

-- ----------------------------------------------------------------------------
-- 2. committees + memberships — powers the "committee leverage" flag and the
--    join that ties fossil lobbying to the official it targets.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS committees (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id        TEXT UNIQUE,                          -- thomas_id / openstates id
  name               TEXT NOT NULL,
  level              TEXT CHECK (level IN ('federal','state','local')),
  chamber            TEXT,
  jurisdiction       TEXT,
  is_energy_relevant BOOLEAN DEFAULT FALSE,                -- the "leverage" signal
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS committee_memberships (
  politician_id  UUID REFERENCES politicians(id) ON DELETE CASCADE,
  committee_id   UUID REFERENCES committees(id)  ON DELETE CASCADE,
  role           TEXT DEFAULT 'member',                    -- member / chair / ranking_member / vice_chair
  is_leadership  BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (politician_id, committee_id)
);
CREATE INDEX IF NOT EXISTS idx_cm_pol ON committee_memberships(politician_id);
CREATE INDEX IF NOT EXISTS idx_cm_cmte ON committee_memberships(committee_id);

-- ----------------------------------------------------------------------------
-- 3. donations — add sub-industry, clean-energy flag, employer, provenance URL.
--    (v1 already has amount, donor_name, donor_type, sector_tag, is_fossil_fuel,
--     cycle_year, source, source_transaction_id.)
-- ----------------------------------------------------------------------------
ALTER TABLE donations ADD COLUMN IF NOT EXISTS industry_subsector  TEXT
  CHECK (industry_subsector IN ('oil_gas','coal','utilities','mining','pipeline','refining','services'));
ALTER TABLE donations ADD COLUMN IF NOT EXISTS is_clean_energy     BOOLEAN DEFAULT FALSE;  -- contrast metric
ALTER TABLE donations ADD COLUMN IF NOT EXISTS employer            TEXT;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS recipient_committee_id TEXT;                -- FEC committee id
ALTER TABLE donations ADD COLUMN IF NOT EXISTS source_url          TEXT;                   -- link to the filing
CREATE INDEX IF NOT EXISTS idx_donations_subsector ON donations(industry_subsector);
CREATE INDEX IF NOT EXISTS idx_donations_clean ON donations(is_clean_energy) WHERE is_clean_energy = TRUE;

-- ----------------------------------------------------------------------------
-- 4. outside_spending — independent expenditures + super-PAC / dark-money
--    spending FOR or AGAINST an official. Distinct from direct contributions.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS outside_spending (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politician_id        UUID REFERENCES politicians(id) ON DELETE CASCADE,
  amount               NUMERIC(12,2) NOT NULL,
  spender_name         TEXT,
  spender_type         TEXT CHECK (spender_type IN ('super_pac','501c4_dark','party','trade_assoc','other')),
  support_or_oppose    TEXT CHECK (support_or_oppose IN ('support','oppose')),
  is_fossil_fuel       BOOLEAN DEFAULT FALSE,
  cycle_year           INTEGER NOT NULL,
  source               TEXT NOT NULL,
  source_transaction_id TEXT,
  source_url           TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source, source_transaction_id)
);
CREATE INDEX IF NOT EXISTS idx_outside_pol ON outside_spending(politician_id);
CREATE INDEX IF NOT EXISTS idx_outside_fossil ON outside_spending(is_fossil_fuel) WHERE is_fossil_fuel = TRUE;

-- ----------------------------------------------------------------------------
-- 5. key_votes — the specific climate/energy votes behind the score.
--    pro_environment + lcv_scored let you show "the votes behind the LCV number."
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS key_votes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politician_id   UUID REFERENCES politicians(id) ON DELETE CASCADE,
  bill_id         TEXT,                                    -- e.g. s1840-118 / SB-204 / Ord.22
  bill_title      TEXT NOT NULL,
  chamber         TEXT,
  position        TEXT CHECK (position IN ('yes','no','sponsor','cosponsor','not_voting','veto','signed')),
  pro_environment BOOLEAN,                                 -- did this position help the climate?
  lcv_scored      BOOLEAN DEFAULT FALSE,                   -- counted toward the LCV score?
  vote_date       DATE,
  congress        INTEGER,
  session         INTEGER,
  roll_call       INTEGER,
  source          TEXT,                                    -- Congress.gov / LCV / Open States / council
  source_url      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(politician_id, bill_id)
);
CREATE INDEX IF NOT EXISTS idx_votes_pol ON key_votes(politician_id);

-- ----------------------------------------------------------------------------
-- 6. lcv_scores — add scope (national/state), score_type (lifetime/session),
--    and provenance. (v1 has score, year, UNIQUE(politician_id, year).)
-- ----------------------------------------------------------------------------
ALTER TABLE lcv_scores ADD COLUMN IF NOT EXISTS scope      TEXT
  CHECK (scope IN ('national','state')) DEFAULT 'national';
ALTER TABLE lcv_scores ADD COLUMN IF NOT EXISTS score_type TEXT
  CHECK (score_type IN ('lifetime','session')) DEFAULT 'session';
ALTER TABLE lcv_scores ADD COLUMN IF NOT EXISTS source_url TEXT;

-- Local officials don't get LCV scores; give them a vote-derived letter grade.
CREATE TABLE IF NOT EXISTS local_env_grades (
  politician_id UUID PRIMARY KEY REFERENCES politicians(id) ON DELETE CASCADE,
  grade         TEXT,                                      -- A / B / B- / C / D / F
  votes_scored  INTEGER,
  method_note   TEXT,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 7. lobbying_spend — what fossil interests spend lobbying (Senate/House LDA).
--    Lobbying is reported by client/registrant on issues, NOT per-politician;
--    tie it to an official through committee jurisdiction (committee_id) and/or
--    energy issue codes. Aggregate per-politician lives in the summary table.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lobbying_spend (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name     TEXT NOT NULL,
  registrant_name TEXT,
  is_fossil_fuel  BOOLEAN DEFAULT FALSE,
  amount          NUMERIC(14,2),
  year            INTEGER NOT NULL,
  quarter         INTEGER,
  issue_codes     TEXT[],                                  -- ENG (energy), ENV (environment), FUE, NRR...
  chamber_targeted TEXT,
  committee_id    UUID REFERENCES committees(id),          -- mapped target committee, when known
  source          TEXT DEFAULT 'Senate LDA',
  filing_uuid     TEXT,
  source_url      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(filing_uuid)
);
CREATE INDEX IF NOT EXISTS idx_lobby_cmte ON lobbying_spend(committee_id);
CREATE INDEX IF NOT EXISTS idx_lobby_fossil ON lobbying_spend(is_fossil_fuel) WHERE is_fossil_fuel = TRUE;

-- ----------------------------------------------------------------------------
-- 8. personal_holdings — the official's OWN fossil investments (PFDs).
--    PFDs report value RANGES, hence min/max.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS personal_holdings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politician_id  UUID REFERENCES politicians(id) ON DELETE CASCADE,
  asset_name     TEXT NOT NULL,
  company        TEXT,
  asset_type     TEXT,                                     -- stock / fund / bond / option
  value_min      NUMERIC(14,2),
  value_max      NUMERIC(14,2),
  is_fossil_fuel BOOLEAN DEFAULT FALSE,
  year           INTEGER NOT NULL,
  source         TEXT,                                     -- House Clerk PFD / Senate eFD
  source_url     TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(politician_id, asset_name, year)
);
CREATE INDEX IF NOT EXISTS idx_holdings_pol ON personal_holdings(politician_id);

-- ----------------------------------------------------------------------------
-- 9. fossil_infrastructure — the fossil footprint physically in a division
--    (EPA GHGRP/FLIGHT emissions + EIA plants). Joined to an official via their
--    ocd_division_id. Keyed to GEOGRAPHY, not the person.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fossil_infrastructure (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ocd_division_id    TEXT REFERENCES divisions(ocd_id),
  facility_name      TEXT,
  facility_type      TEXT,                                 -- power_plant / refinery / well / pipeline / permit / compressor
  fuel_type          TEXT,                                 -- gas / coal / oil
  status             TEXT,                                 -- operating / proposed / retiring
  annual_co2e_tonnes NUMERIC(16,2),
  capacity_mw        NUMERIC(12,2),
  year               INTEGER,
  lat                NUMERIC(9,6),
  lng                NUMERIC(9,6),
  source             TEXT,                                 -- EPA GHGRP / EIA-860 / EIA-923
  facility_id        TEXT,
  source_url         TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source, facility_id, year)
);
CREATE INDEX IF NOT EXISTS idx_infra_div ON fossil_infrastructure(ocd_division_id);

-- ----------------------------------------------------------------------------
-- 10. challengers — election context: who's running against the incumbent,
--     so users see who they can vote FOR (the original product goal).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS challengers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seat_division_id TEXT REFERENCES divisions(ocd_id),
  name             TEXT NOT NULL,
  party            TEXT,
  pledge_status    TEXT,
  fossil_direct    NUMERIC(14,2),
  election_date    DATE,
  fec_candidate_id TEXT,
  source_url       TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chall_div ON challengers(seat_division_id);

-- ----------------------------------------------------------------------------
-- 11. politician_summaries — EXPANDED read-optimized row the API serves in one
--     query. ETL recomputes this nightly so the frontend never joins at runtime.
-- ----------------------------------------------------------------------------
ALTER TABLE politician_summaries ADD COLUMN IF NOT EXISTS total_raised             NUMERIC(14,2) DEFAULT 0;
ALTER TABLE politician_summaries ADD COLUMN IF NOT EXISTS fossil_pct               NUMERIC(5,2) DEFAULT 0;
ALTER TABLE politician_summaries ADD COLUMN IF NOT EXISTS total_outside_fossil     NUMERIC(14,2) DEFAULT 0;
ALTER TABLE politician_summaries ADD COLUMN IF NOT EXISTS subsector_breakdown      JSONB;   -- {oil_gas, coal, utilities, mining}
ALTER TABLE politician_summaries ADD COLUMN IF NOT EXISTS pac_vs_individual        JSONB;   -- {pac, individual}
ALTER TABLE politician_summaries ADD COLUMN IF NOT EXISTS top_donors               JSONB;   -- [{name, amount, subsector, type}]
ALTER TABLE politician_summaries ADD COLUMN IF NOT EXISTS key_votes                JSONB;   -- [{bill_id, title, position, pro_environment}]
ALTER TABLE politician_summaries ADD COLUMN IF NOT EXISTS fossil_lobbying_total    NUMERIC(14,2) DEFAULT 0;
ALTER TABLE politician_summaries ADD COLUMN IF NOT EXISTS fossil_lobbying_top      JSONB;   -- [{name, amount}]
ALTER TABLE politician_summaries ADD COLUMN IF NOT EXISTS personal_fossil_count    INTEGER DEFAULT 0;
ALTER TABLE politician_summaries ADD COLUMN IF NOT EXISTS personal_fossil_value_min NUMERIC(14,2) DEFAULT 0;
ALTER TABLE politician_summaries ADD COLUMN IF NOT EXISTS personal_fossil_value_max NUMERIC(14,2) DEFAULT 0;
ALTER TABLE politician_summaries ADD COLUMN IF NOT EXISTS holdings                 JSONB;   -- [{company, value_range}]
ALTER TABLE politician_summaries ADD COLUMN IF NOT EXISTS district_stakes          JSONB;   -- [{value, label}]
ALTER TABLE politician_summaries ADD COLUMN IF NOT EXISTS local_grade              TEXT;
ALTER TABLE politician_summaries ADD COLUMN IF NOT EXISTS pledge_status            TEXT;
ALTER TABLE politician_summaries ADD COLUMN IF NOT EXISTS committee_leverage       BOOLEAN DEFAULT FALSE;
ALTER TABLE politician_summaries ADD COLUMN IF NOT EXISTS flagged                  BOOLEAN DEFAULT FALSE;
ALTER TABLE politician_summaries ADD COLUMN IF NOT EXISTS profile                  JSONB;   -- optional full blob for the detail page

-- ----------------------------------------------------------------------------
-- 12. homepage_stats — add multi-level + outside money + pledge counts.
-- ----------------------------------------------------------------------------
ALTER TABLE homepage_stats ADD COLUMN IF NOT EXISTS total_outside_fossil NUMERIC(14,2) DEFAULT 0;
ALTER TABLE homepage_stats ADD COLUMN IF NOT EXISTS pledge_signers       INTEGER DEFAULT 0;
ALTER TABLE homepage_stats ADD COLUMN IF NOT EXISTS officials_tracked    INTEGER DEFAULT 0;

-- ----------------------------------------------------------------------------
-- 13. data_sources — catalog powering the "Data sources" panel + per-number
--     provenance, plus an ETL run log for freshness/observability.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS data_sources (
  key          TEXT PRIMARY KEY,                           -- whoboughtmyrep, followthemoney, lcv, lda, ...
  label        TEXT NOT NULL,
  url          TEXT,
  description  TEXT,
  coverage     TEXT,                                       -- federal / state / local / all
  cadence      TEXT,                                       -- nightly / weekly / quarterly / annual
  last_synced  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS etl_runs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script       TEXT NOT NULL,
  status       TEXT CHECK (status IN ('running','success','error')),
  rows_upserted INTEGER,
  started_at   TIMESTAMPTZ DEFAULT NOW(),
  finished_at  TIMESTAMPTZ,
  notes        TEXT
);

-- ----------------------------------------------------------------------------
-- 14. Row-Level Security: public read on display tables; writes via service key.
-- ----------------------------------------------------------------------------
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'divisions','zip_to_division','committees','committee_memberships',
    'outside_spending','key_votes','local_env_grades','lobbying_spend',
    'personal_holdings','fossil_infrastructure','challengers','data_sources','etl_runs'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format($p$CREATE POLICY "public_read_%1$s" ON %1$I FOR SELECT USING (true);$p$, t);
    EXECUTE format('GRANT SELECT ON %I TO anon, authenticated;', t);
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 15. Convenience view: the full profile join (handy for ad-hoc queries; the
--     hot path should still read politician_summaries.profile).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_politician_full AS
SELECT p.*,
       s.fossil_pct, s.total_outside_fossil, s.subsector_breakdown,
       s.pac_vs_individual, s.top_donors, s.key_votes, s.fossil_lobbying_total,
       s.holdings, s.district_stakes, s.flagged, s.committee_leverage,
       d.name AS division_name, d.division_type
FROM politicians p
LEFT JOIN politician_summaries s ON s.politician_id = p.id
LEFT JOIN divisions d           ON d.ocd_id = p.ocd_division_id;

-- ============================================================================
-- End v2 migration.
-- ============================================================================
