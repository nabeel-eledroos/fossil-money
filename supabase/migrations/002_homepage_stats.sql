-- ============================================================================
-- Fossil Money — homepage_stats national-aggregate fields
-- Powers the home "national picture" panel:
--   1) total fossil-fuel $   2) % of all money from fossil   3) clean-energy $
--   4) pledge signers
-- Run after schema_v2_migration.sql. Idempotent.
-- ============================================================================

-- Already present: total_fossil_fuel_donations (v1), pledge_signers (v2),
-- officials_tracked (v2), total_outside_fossil (v2), last_updated (v1).
ALTER TABLE homepage_stats ADD COLUMN IF NOT EXISTS total_raised_all              NUMERIC(16,2) DEFAULT 0;  -- denominator
ALTER TABLE homepage_stats ADD COLUMN IF NOT EXISTS fossil_pct_of_total          NUMERIC(5,2)  DEFAULT 0;  -- stat #2
ALTER TABLE homepage_stats ADD COLUMN IF NOT EXISTS total_clean_energy_donations NUMERIC(16,2) DEFAULT 0;  -- stat #3 (green)
ALTER TABLE homepage_stats ADD COLUMN IF NOT EXISTS scope                        TEXT DEFAULT 'national';
ALTER TABLE homepage_stats ADD COLUMN IF NOT EXISTS as_of_label                  TEXT;                     -- e.g. "2023–2024 cycle"

-- homepage_stats is a single-row table (id = 1). Ensure public read (no-op if already set).
ALTER TABLE homepage_stats ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='homepage_stats' AND policyname='public_read_homepage_stats') THEN
    CREATE POLICY "public_read_homepage_stats" ON homepage_stats FOR SELECT USING (true);
  END IF;
END $$;
GRANT SELECT ON homepage_stats TO anon, authenticated;

-- Computation (performed in etl/scripts/aggregate_summaries.py, written as one row id=1):
--   total_fossil_fuel_donations   = SUM(donations.amount)            WHERE is_fossil_fuel
--   total_clean_energy_donations  = SUM(donations.amount)            WHERE is_clean_energy
--   total_outside_fossil          = SUM(outside_spending.amount)     WHERE is_fossil_fuel
--   total_raised_all              = SUM(politicians.total_raised)    over tracked officials
--   fossil_pct_of_total           = 100 * total_fossil_fuel_donations / NULLIF(total_raised_all,0)
--   pledge_signers                = COUNT(politicians)               WHERE pledge_status = 'signed'
--   officials_tracked             = COUNT(politicians)
--   as_of_label                   = the contribution cycle covered (display only)
