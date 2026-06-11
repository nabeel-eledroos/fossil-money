-- Add classification_method to track how donations were classified
-- This allows us to update classifications later (e.g., when OpenSecrets bulk data is available)
-- without changing the schema

ALTER TABLE donations ADD COLUMN IF NOT EXISTS classification_method TEXT
  CHECK (classification_method IN (
    'opensecrets_pac',      -- Matched via OpenSecrets PAC committee ID
    'fec_committee_cache',  -- Matched via our cached fossil committee list
    'company_list',         -- Matched via fossil_company_list in config
    'keyword',              -- Matched via keyword heuristics
    'manual',               -- Manually classified
    'unknown'               -- Legacy/unclassified
  )) DEFAULT 'unknown';

CREATE INDEX IF NOT EXISTS idx_donations_classification ON donations(classification_method);

-- Backfill existing fossil fuel donations as 'unknown' (legacy)
-- They can be re-classified when we run the updated ETL
UPDATE donations SET classification_method = 'unknown' WHERE classification_method IS NULL;
