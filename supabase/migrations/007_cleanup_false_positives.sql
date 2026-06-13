-- ============================================================================
-- Fossil Money — Cleanup False Positive Classifications
-- 
-- This migration removes donations that were incorrectly classified as fossil fuel:
-- 1. SpaceX PAC donations (matched "exploration" keyword, but it's aerospace)
-- 2. Individual donors whose surnames match fossil company names (e.g., "Williams")
--
-- The ETL matched "SPACE EXPLORATION TECHNOLOGIES CORP" due to the generic
-- "exploration" keyword in fetch_fec_committees.py, and matched individuals
-- named "Williams" against "Williams Companies" in the fossil company list.
-- ============================================================================

-- First, let's see what we're about to delete (run SELECT first to verify)
-- SELECT donor_name, donor_type, amount, classification_method 
-- FROM donations 
-- WHERE is_fossil_fuel = TRUE 
--   AND (
--     donor_name ILIKE '%SPACE EXPLORATION%'
--     OR donor_name ILIKE '%SPACEX%'
--   );

-- 1. Delete SpaceX/space exploration false positives
DELETE FROM donations 
WHERE is_fossil_fuel = TRUE 
  AND (
    donor_name ILIKE '%SPACE EXPLORATION%'
    OR donor_name ILIKE '%SPACEX%'
    OR donor_name ILIKE '%BLUE ORIGIN%'
    OR donor_name ILIKE '%VIRGIN GALACTIC%'
  );

-- 2. Delete individual donors whose surnames falsely match fossil companies
-- Pattern: "LASTNAME, FIRSTNAME" where LASTNAME matches a company name
-- The Williams Companies is the main culprit, but check for others

-- Williams (matches "Williams Companies")
DELETE FROM donations
WHERE is_fossil_fuel = TRUE
  AND donor_type = 'Individual'
  AND donor_name ~* '^WILLIAMS\s*,'
  AND classification_method IN ('company_list', 'keyword', 'unknown');

-- Koch (matches "Koch" - but legitimate Koch family members ARE fossil fuel)
-- Skip this one - Koch individuals are likely actually fossil-connected

-- Murphy (matches "Murphy Oil" - but Murphy USA gas stations are excluded)
-- Only delete if clearly not oil-related employer
DELETE FROM donations
WHERE is_fossil_fuel = TRUE
  AND donor_type = 'Individual'
  AND donor_name ~* '^MURPHY\s*,'
  AND classification_method IN ('company_list', 'keyword', 'unknown')
  AND (employer IS NULL OR employer NOT ILIKE '%oil%');

-- Baker (matches "Baker Hughes")
DELETE FROM donations
WHERE is_fossil_fuel = TRUE
  AND donor_type = 'Individual'
  AND donor_name ~* '^BAKER\s*,'
  AND classification_method IN ('company_list', 'keyword', 'unknown')
  AND (employer IS NULL OR employer NOT ILIKE '%baker hughes%');

-- Hess (matches "Hess")
DELETE FROM donations
WHERE is_fossil_fuel = TRUE
  AND donor_type = 'Individual'
  AND donor_name ~* '^HESS\s*,'
  AND classification_method IN ('company_list', 'keyword', 'unknown')
  AND (employer IS NULL OR employer NOT ILIKE '%hess%');

-- ============================================================================
-- End cleanup migration
-- ============================================================================
