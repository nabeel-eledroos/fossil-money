-- ============================================================================
-- Fossil Money — Cleanup False Positive: HESS, VIRGINIA
--
-- HESS, VIRGINIA is incorrectly classified as a fossil fuel donor because
-- "Hess" matches Hess Corporation in the fossil_company_list.
--
-- Migration 007 attempted to handle surname matches but may have missed this
-- due to classification_method or employer conditions.
--
-- This migration removes all donations from this individual.
-- ============================================================================

-- Delete HESS, VIRGINIA - false positive (individual, not Hess Corporation)
DELETE FROM donations
WHERE is_fossil_fuel = TRUE
  AND donor_type = 'Individual'
  AND donor_name ILIKE 'HESS, VIRGINIA%';

-- ============================================================================
-- End cleanup migration
-- ============================================================================
