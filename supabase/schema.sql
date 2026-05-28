-- Fossil Money Database Schema
-- Run this in your Supabase SQL editor to create all tables

-- ZIP to congressional district mapping (from Census Bureau crosswalk)
CREATE TABLE IF NOT EXISTS zip_to_district (
  zip_code VARCHAR(5) PRIMARY KEY,
  state VARCHAR(2) NOT NULL,
  congressional_district VARCHAR(10) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Core politician record (FEC ID as primary key for federal)
CREATE TABLE IF NOT EXISTS politicians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bioguide_id VARCHAR(20) UNIQUE,
  fec_candidate_id VARCHAR(20),
  name VARCHAR(255) NOT NULL,
  party VARCHAR(50),
  chamber VARCHAR(50),
  state VARCHAR(2),
  district VARCHAR(10),
  committee VARCHAR(100),
  photo_url TEXT,
  office_phone VARCHAR(20),
  office_email VARCHAR(255),
  website_url TEXT,
  signed_nffm_pledge BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Donation records with source tracking
CREATE TABLE IF NOT EXISTS donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politician_id UUID REFERENCES politicians(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  donor_name VARCHAR(255),
  donor_type VARCHAR(50),
  sector_tag VARCHAR(100),
  is_fossil_fuel BOOLEAN DEFAULT FALSE,
  cycle_year INTEGER NOT NULL,
  source VARCHAR(50) NOT NULL,
  source_transaction_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(source, source_transaction_id)
);

-- LCV scores with history
CREATE TABLE IF NOT EXISTS lcv_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  politician_id UUID REFERENCES politicians(id) ON DELETE CASCADE,
  score INTEGER CHECK (score >= 0 AND score <= 100),
  year INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(politician_id, year)
);

-- Aggregated view for fast queries
CREATE TABLE IF NOT EXISTS politician_summaries (
  politician_id UUID PRIMARY KEY REFERENCES politicians(id) ON DELETE CASCADE,
  total_fossil_fuel_donations DECIMAL(14,2) DEFAULT 0,
  total_clean_energy_donations DECIMAL(14,2) DEFAULT 0,
  latest_lcv_score INTEGER,
  lcv_score_trend JSONB,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Homepage aggregate stats (single row, updated by ETL)
CREATE TABLE IF NOT EXISTS homepage_stats (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  total_fossil_fuel_donations DECIMAL(14,2) DEFAULT 0,
  members_with_fossil_money INTEGER DEFAULT 0,
  members_with_fossil_money_pct DECIMAL(5,2) DEFAULT 0,
  avg_lcv_top_50 INTEGER DEFAULT 0,
  members_with_zero INTEGER DEFAULT 0,
  avg_lcv_zero_members INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_politicians_state ON politicians(state);
CREATE INDEX IF NOT EXISTS idx_politicians_chamber ON politicians(chamber);
CREATE INDEX IF NOT EXISTS idx_politicians_state_chamber ON politicians(state, chamber);
CREATE INDEX IF NOT EXISTS idx_donations_politician ON donations(politician_id);
CREATE INDEX IF NOT EXISTS idx_donations_fossil_fuel ON donations(is_fossil_fuel) WHERE is_fossil_fuel = TRUE;
CREATE INDEX IF NOT EXISTS idx_lcv_scores_politician_year ON lcv_scores(politician_id, year);
CREATE INDEX IF NOT EXISTS idx_zip_to_district_state ON zip_to_district(state);

-- Row Level Security (RLS)
ALTER TABLE zip_to_district ENABLE ROW LEVEL SECURITY;
ALTER TABLE politicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lcv_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE politician_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_stats ENABLE ROW LEVEL SECURITY;

-- Public read access policies
CREATE POLICY "Allow public read access on zip_to_district"
  ON zip_to_district FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access on politicians"
  ON politicians FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access on donations"
  ON donations FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access on lcv_scores"
  ON lcv_scores FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access on politician_summaries"
  ON politician_summaries FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access on homepage_stats"
  ON homepage_stats FOR SELECT
  USING (true);

-- Grant permissions
GRANT SELECT ON zip_to_district TO anon, authenticated;
GRANT SELECT ON politicians TO anon, authenticated;
GRANT SELECT ON donations TO anon, authenticated;
GRANT SELECT ON lcv_scores TO anon, authenticated;
GRANT SELECT ON politician_summaries TO anon, authenticated;
GRANT SELECT ON homepage_stats TO anon, authenticated;
