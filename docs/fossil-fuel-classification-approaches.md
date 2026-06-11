# Fossil Fuel Donation Classification: Data Sources and Approaches

This document outlines all possible approaches for accurately classifying donations as fossil fuel-related, including PAC donations and individual contributions.

## Current Problems

Our current approach uses keyword matching on PAC names and employer names, which causes:
- **False positives**: "Williams" matches anyone named Williams (not just Williams Companies)
- **False positives**: "oil" matches "American Olive Oil Producers Association"
- **False positives**: "SpaceX PAC" classified as fossil fuel (unknown reason)
- **Ambiguous matches**: Short company names like "Koch", "Hess", "Marathon" are common surnames

---

## Classification Approaches

### 1. OpenSecrets Bulk Data

**Source**: https://www.opensecrets.org/open-data/bulk-data

> **IMPORTANT**: OpenSecrets API was **discontinued on April 15, 2025**. Only bulk data downloads are available.

**What it provides**:
- **RealCode**: 5-character industry code assigned to EVERY contribution (PAC and individual)
- **Pre-classified data**: OpenSecrets employs researchers who manually classify contributions
- **Coverage**: Federal contributions since 1990

**Fossil Fuel Industry Codes**:
| Code | Description |
|------|-------------|
| E1100 | Oil & Gas |
| E1110 | Major (multinational) oil & gas producers |
| E1120 | Independent oil & gas producers |
| E1140 | Natural Gas transmission & distribution |
| E1150 | Oilfield service, equipment & exploration |
| E1160 | Petroleum refining & marketing |
| E1170 | Gasoline service stations |
| E1180 | Fuel oil dealers |
| E1190 | LPG/Liquid Propane dealers & producers |
| E1200 | Mining |
| E1210 | Coal mining |
| E1220 | Metal mining & processing |
| E1240 | Mining services & equipment |

**Clean Energy Codes** (to exclude):
| Code | Description |
|------|-------------|
| E1500 | Alternate energy production & services |
| E1510 | Solar Energy |
| E1520 | Wind Energy |
| E1530 | Biofuel |

**How it works**:
1. Sign up at https://www.opensecrets.org/bulk-data/signup (free for educational use)
2. Download individual contributions and PAC data with RealCode field
3. Filter contributions where RealCode starts with `E11` (Oil & Gas) or `E121` (Coal mining)

**Pros**:
- Gold standard - used by journalists and researchers worldwide
- Human-verified classifications
- Covers both PACs AND individual donations
- Includes employer standardization (e.g., "EXXON MOBIL" and "EXXONMOBIL CORP" map to same entity)

**Cons**:
- **API discontinued** - must download bulk files manually
- Requires signup and agreement to terms of use
- Large data files (~2GB per cycle)
- Updated periodically, not real-time
- Educational use only (no commercial use without license)
- **Cannot integrate into live ETL** - would need to periodically re-download

---

### 2. No Fossil Fuel Money Pledge Company List

**Source**: https://nofossilfuelmoney.org/company-list/

**What it provides**:
- Curated list of ~3,000+ fossil fuel companies
- Used to verify if politicians have violated the "No Fossil Fuel Money" pledge
- CSV download available: https://docs.google.com/spreadsheets/d/e/2PACX-1vQ1Rrb2LHfDTZFZ1k8OT2an6j86PhdqCsJM7XnDMwadFpEdhbB6I0Cg1n2opekdFOJh8JyHF43sJgcs/pub?gid=0&single=true&output=csv

**Methodology**:
- Sourced from OpenSecrets + FollowTheMoney data (2000-2019)
- Includes oil, gas, coal companies that have been politically active
- Additional research by Oil Change International for utilities

**Pros**:
- Ready-to-use list of verified fossil fuel companies
- Specifically designed for campaign finance classification
- Well-documented methodology

**Cons**:
- Only covers companies active 2000-2019 (may miss newer companies)
- Doesn't classify individual donations by occupation
- Not updated regularly

---

### 3. NAICS Code Matching

**Source**: Bureau of Labor Statistics / Census Bureau

**Relevant NAICS Codes**:
| Code | Description |
|------|-------------|
| 211 | Oil and Gas Extraction |
| 21111 | Crude Petroleum and Natural Gas Extraction |
| 213111 | Drilling Oil and Gas Wells |
| 213112 | Support Activities for Oil and Gas Operations |
| 2121 | Coal Mining |
| 32411 | Petroleum Refineries |
| 4861 | Pipeline Transportation of Crude Oil |
| 4862 | Pipeline Transportation of Natural Gas |

**How it would work**:
1. Match employer names to companies in NAICS database
2. Classify donations based on company's NAICS code

**Pros**:
- Standard government classification system
- Would work for individual donations

**Cons**:
- No direct FEC-to-NAICS mapping exists
- Would require building/purchasing employer-to-NAICS mapping
- Many employers in FEC data are vague or misspelled

---

### 4. Direct FEC PAC Classification

**Source**: FEC API (https://api.open.fec.gov)

**What's available**:
- Committee type (PAC, Super PAC, etc.)
- Connected organization
- Committee designation

**What's NOT available**:
- Industry classification
- No sector codes

**Current approach limitations**:
FEC does not classify PACs by industry. Our current approach scans PAC names for keywords, which is why we get false positives.

**Pros**:
- Real-time data
- Free API

**Cons**:
- No industry classification - you must infer from name/connected org
- Name-based classification is unreliable

---

### 5. FollowTheMoney (State-Level Data)

**Source**: https://www.followthemoney.org/our-data/apis

**What it provides**:
- State campaign finance data
- Industry classifications similar to OpenSecrets
- API available

**Note**: FollowTheMoney merged with OpenSecrets in 2021. Federal data is now at OpenSecrets.

**Pros**:
- Good for state-level contributions
- Industry codes included

**Cons**:
- Federal data now redirects to OpenSecrets
- Would need separate integration for state data

---

### 6. Hybrid Approach (Build Your Own)

**Strategy**: Combine multiple data sources

1. **Start with No Fossil Fuel Money list** as base company list
2. **Enhance with OpenSecrets RealCode mappings** for industry verification
3. **Use strict company name matching** instead of keyword matching:
   - "Williams Companies" instead of "Williams"
   - "Koch Industries" instead of "Koch"
4. **For PACs**: Match FEC committee IDs to OpenSecrets PAC data
5. **For individuals**: Match employer to verified company list

**Implementation**:
```python
# Example: Enhanced company matching
FOSSIL_COMPANIES = {
    "williams companies": "pipeline",
    "williams partners": "pipeline", 
    "koch industries": "oil_gas",
    "marathon petroleum": "refining",
    "marathon oil": "oil_gas",
    # ... full list from No Fossil Fuel Money
}

def is_fossil_employer(employer):
    employer_lower = employer.lower().strip()
    # Exact match or close match
    for company, sector in FOSSIL_COMPANIES.items():
        if company in employer_lower:
            return True, sector
    return False, None
```

---

### 7. FEC Bulk Data + Manual Classification (RECOMMENDED)

**Source**: https://www.fec.gov/data/browse-data/

The FEC provides real-time bulk data downloads with employer/occupation for individuals and committee names for PACs. However, **FEC does NOT provide industry classification** - you must build your own.

**Available FEC Data**:
- **Individual Contributions**: Name, employer, occupation, amount, date, recipient
- **Committee Master**: PAC names, types, connected organizations
- **PAC to Candidates**: Which PACs gave to which candidates

**Key Insight**: FEC raw data has NO industry codes. You must classify yourself.

**How to build accurate classification**:
1. Download No Fossil Fuel Money company list as your source of truth
2. Match PAC names and employer names against this verified list
3. Use exact/fuzzy matching instead of keyword matching

---

## Recommendation

### BEST APPROACH: Curated Company List + FEC Data

Since OpenSecrets API is discontinued, the most practical approach is:

1. **Download No Fossil Fuel Money company list** (~3,000 verified fossil fuel companies)
   - CSV: https://docs.google.com/spreadsheets/d/e/2PACX-1vQ1Rrb2LHfDTZFZ1k8OT2an6j86PhdqCsJM7XnDMwadFpEdhbB6I0Cg1n2opekdFOJh8JyHF43sJgcs/pub?gid=0&single=true&output=csv
   
2. **Replace keyword matching with exact matching** against this list
   - Match PAC connected organizations
   - Match individual employer names
   
3. **For PACs**: Match the "connected organization" field (if available) or PAC name against the company list

4. **For Individuals**: Match employer name against the company list

### Alternative: OpenSecrets Bulk Data (One-Time Download)

If you want the most accurate data and don't need real-time updates:
1. Sign up at https://www.opensecrets.org/bulk-data/signup
2. Download the Individual Contributions file with RealCode
3. Use this as your complete dataset (but it won't be real-time)

---

## Data Source Comparison

| Source | PAC Classification | Individual Classification | Accuracy | Freshness | Programmatic Access |
|--------|-------------------|--------------------------|----------|-----------|---------------------|
| OpenSecrets Bulk | ✅ RealCode | ✅ RealCode | High | Periodic | ❌ Manual download only |
| No Fossil Fuel Money | ✅ Company list | ⚠️ Employer match | High | 2019 | ✅ CSV download |
| FEC API | ❌ No industry | ❌ No industry | N/A | Real-time | ✅ Full API |
| FEC Bulk Data | ❌ No industry | ❌ No industry | N/A | Daily | ✅ Bulk downloads |
| Keyword Matching | ❌ False positives | ❌ False positives | Low | Real-time | ✅ |

---

## Implementation Plan

### Phase 1: Immediate Fix (Use Company List)

1. Download No Fossil Fuel Money CSV
2. Load into `etl/data/nffm_fossil_companies.csv`
3. Rewrite `is_fossil_committee()` to match against this list instead of keywords
4. For individuals, match employer against list

### Phase 2: Enhanced Matching

1. Build fuzzy matching for employer names (handle typos, abbreviations)
2. Add manual overrides for known false positives (SpaceX, Olive Oil, etc.)
3. Create exclusion list for common false positives

### Phase 3: Periodic Updates (Optional)

1. Sign up for OpenSecrets bulk data
2. Periodically download and cross-reference
3. Update company list with any new entries

---

## Summary

**The core problem**: Neither FEC nor any free API provides industry classification. You must build your own.

**The solution**: Use the No Fossil Fuel Money company list as your authoritative source, which was built from OpenSecrets + FollowTheMoney data by climate researchers.

**Key insight**: The "No Fossil Fuel Money" pledge organization has already done the hard work of curating ~3,000 fossil fuel companies. Use their list instead of reinventing the wheel with keyword matching.

## References

- OpenSecrets Bulk Data: https://www.opensecrets.org/open-data/bulk-data (API discontinued April 2025)
- OpenSecrets CRP Categories: https://dkftve4js3etk.cloudfront.net/downloads/crp/CRP_Categories.txt
- No Fossil Fuel Money Company List: https://nofossilfuelmoney.org/company-list/
- No Fossil Fuel Money Methodology: https://docs.google.com/document/d/10cwRhvTQYBlVolD2T0pm85oGEebBuv06Vfipcziuyzg/
- FEC Bulk Data: https://www.fec.gov/data/browse-data/
- FEC API: https://api.open.fec.gov/developers/ (still active, but no industry codes)
