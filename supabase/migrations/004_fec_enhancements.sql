-- ============================================================================
-- Fossil Money — FEC Data Enhancements
-- Adds columns needed for full FEC bulk data integration
-- ============================================================================

-- Add contribution date for time-series analysis
ALTER TABLE donations ADD COLUMN IF NOT EXISTS contribution_date DATE;
CREATE INDEX IF NOT EXISTS idx_donations_date ON donations(contribution_date);

-- Add contributor city/state for geographic analysis
ALTER TABLE donations ADD COLUMN IF NOT EXISTS contributor_city TEXT;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS contributor_state VARCHAR(2);

-- Add committee name (the PAC/committee that made the contribution)
ALTER TABLE donations ADD COLUMN IF NOT EXISTS committee_name TEXT;

-- Add FEC-specific IDs for deduplication and linking
ALTER TABLE donations ADD COLUMN IF NOT EXISTS fec_committee_id TEXT;  -- Contributing committee's FEC ID
ALTER TABLE donations ADD COLUMN IF NOT EXISTS fec_file_number TEXT;   -- Filing number for provenance

-- Index for efficient cycle + fossil fuel queries
CREATE INDEX IF NOT EXISTS idx_donations_cycle_fossil 
  ON donations(cycle_year, is_fossil_fuel) 
  WHERE is_fossil_fuel = TRUE;

-- ============================================================================
-- End FEC enhancements
-- ============================================================================
