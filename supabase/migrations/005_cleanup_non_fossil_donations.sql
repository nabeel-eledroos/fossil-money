-- ============================================================================
-- Fossil Money — Cleanup Non-Fossil/Clean Donations
-- 
-- This migration removes donations that are neither fossil fuel nor clean energy.
-- These were previously stored for total_raised calculation, but total_raised
-- is now calculated on-the-fly during ETL and stored on the politicians table.
--
-- Before running: ~282,781 rows
-- After running: ~6,020 rows (fossil + clean only)
-- Space savings: ~97.9%
-- ============================================================================

-- Delete donations that are neither fossil fuel nor clean energy
DELETE FROM donations 
WHERE is_fossil_fuel = FALSE 
  AND (is_clean_energy = FALSE OR is_clean_energy IS NULL);

-- ============================================================================
-- End cleanup migration
-- ============================================================================
