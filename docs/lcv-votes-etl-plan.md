# LCV Voting Record ETL - Implementation Plan

## Overview

Populate the `key_votes` table with individual politician voting records on environmentally significant legislation, using LCV scorecards as the source of which votes matter.

## Data Flow

```
LCV Votes CSV                    Congress.gov / Clerk XML
(which votes are scored)         (how each member voted)
        │                                  │
        └──────────┬───────────────────────┘
                   ▼
            ETL Script
         (fetch_lcv_votes.py)
                   │
                   ▼
           key_votes table
          (per-politician records)
```

## Data Sources

### 1. LCV Votes CSV (input)
- **Source**: Manual download from https://scorecard.lcv.org/
- **Location**: `etl/data/lcv_votes_{year}.csv`
- **Format**:
  ```csv
  "Senate Votes"
  "Vote Title",Year,"Roll Call Vote Number","Vote Link"
  "Zeldin Confirmation (EPA Administrator)",2025,24,https://www.lcv.org/...
  
  "House Votes"
  "Vote Title",Year,"Roll Call Vote Number","Vote Link"
  "Rolling Back the Methane Polluter Fee",2025,52,https://www.lcv.org/...
  ```
- **Provides**: Vote title, year, roll call number, chamber, LCV source URL

### 2. Congress.gov Clerk XML (fetched automatically)
- **House**: `https://clerk.house.gov/evs/{year}/roll{number:03d}.xml`
- **Senate**: `https://www.senate.gov/legislative/LIS/roll_call_votes/vote{congress}{session}/vote_{congress}_{session}_{number:05d}.xml`
- **Provides**: How each member voted (Yea/Nay/Present/Not Voting), bioguide_id, bill info

## Target Schema

Existing `key_votes` table:
```sql
key_votes (
  id UUID PRIMARY KEY,
  politician_id UUID REFERENCES politicians(id),
  bill_id TEXT,              -- e.g., "HJRES35"
  bill_title TEXT,           -- LCV's descriptive title
  chamber TEXT,              -- "house" or "senate"
  position TEXT,             -- "Yea", "Nay", "Present", "Not Voting"
  pro_environment BOOLEAN,   -- Did they vote the pro-environment way?
  lcv_scored BOOLEAN,        -- TRUE (all these are LCV-scored)
  vote_date DATE,
  congress INTEGER,          -- e.g., 119
  session INTEGER,           -- e.g., 1
  roll_call INTEGER,         -- e.g., 52
  source TEXT,               -- "lcv"
  source_url TEXT            -- LCV vote page URL
)
```

## Implementation Steps

### Step 1: Create the ETL Script

**File**: `etl/scripts/fetch_lcv_votes.py`

**Arguments**:
- `--csv PATH` - Path to LCV votes CSV file (required)
- `--year YEAR` - Year to process (default: detect from CSV)
- `--chamber house|senate|both` - Which chamber to process (default: both)
- `--dry-run` - Parse and match but don't insert

**Core Logic**:

```python
def parse_lcv_csv(csv_path):
    """Parse LCV votes CSV, handling Senate/House sections."""
    # Returns list of:
    # {title, year, roll_call, chamber, lcv_url}

def determine_pro_environment_position(vote_title):
    """
    Determine which vote (Yea/Nay) is pro-environment based on LCV framing.
    
    Negative framing (Yea = bad):
    - "Rolling Back...", "Blocking...", "Undermining...", 
    - "Removing...", "Stifling...", "Gutting..."
    
    Positive framing (Yea = good):
    - "Protecting...", "Maintaining...", "Ensuring..."
    - "Reinstating...", "Sustaining..."
    
    Confirmations (case-by-case):
    - EPA Administrator confirmations typically Nay = good
    """

def fetch_house_roll_call(year, roll_call):
    """Fetch House clerk XML and parse votes."""
    url = f"https://clerk.house.gov/evs/{year}/roll{roll_call:03d}.xml"
    # Returns: {bill_id, vote_date, congress, session, votes: [{bioguide_id, position}]}

def fetch_senate_roll_call(year, roll_call):
    """Fetch Senate clerk XML and parse votes."""
    # Congress/session calculation needed
    # Returns same format as House

def match_and_insert(supabase, vote_info, roll_call_data, pro_env_position):
    """Match bioguide_ids to politicians and insert key_votes."""
```

### Step 2: Pro-Environment Position Logic

The trickiest part is determining which vote (Yea/Nay) is pro-environment. Strategy:

1. **Keyword-based heuristics** (covers ~80% of cases):
   ```python
   ANTI_ENV_KEYWORDS = [
       'rolling back', 'blocking', 'undermining', 'removing', 
       'stifling', 'gutting', 'defunding', 'reversing',
       'fast-tracking fossil', 'opening public lands',
       'rushing pipeline', 'permission to pollute'
   ]
   # If title contains these, Yea = anti-environment
   
   PRO_ENV_KEYWORDS = [
       'protecting', 'maintaining', 'ensuring', 'reinstating',
       'sustaining', 'preventing', 'terminating the sham'
   ]
   # If title contains these, Yea = pro-environment
   ```

2. **Confirmation votes**: Check if title contains "Confirmation" - these are typically anti-environment appointees, so Nay = pro-environment

3. **Fallback**: Log ambiguous titles for manual review

### Step 3: Handle Both Chambers

**House XML** structure (already tested):
```xml
<recorded-vote>
  <legislator name-id="A000370" party="D" state="NC">Adams</legislator>
  <vote>Nay</vote>
</recorded-vote>
```

**Senate XML** structure (needs testing):
```xml
<member>
  <lis_member_id>S001234</lis_member_id>
  <bioguide_id>A000360</bioguide_id>
  <party>D</party>
  <state>TN</state>
  <vote_cast>Nay</vote_cast>
</member>
```

Senate URL pattern:
```
https://www.senate.gov/legislative/LIS/roll_call_votes/vote{congress}{session}/vote_{congress}_{session}_{roll_call:05d}.xml
```

Congress/session calculation:
- 119th Congress = 2025-2026
- Session 1 = odd year (2025), Session 2 = even year (2026)

### Step 4: Upsert Logic

Use composite key for deduplication:
```python
# Check if vote already exists for this politician + roll call
existing = supabase.table('key_votes')\
    .select('id')\
    .eq('politician_id', politician_id)\
    .eq('congress', congress)\
    .eq('session', session)\
    .eq('roll_call', roll_call)\
    .eq('chamber', chamber)\
    .execute()
```

### Step 5: Update Aggregation Script

Modify `aggregate_summaries.py` to populate `politician_summaries.key_votes` JSONB field:
```python
# Fetch recent key votes for politician
votes = supabase.table('key_votes')\
    .select('bill_title, vote_date, pro_environment')\
    .eq('politician_id', pol_id)\
    .order('vote_date', desc=True)\
    .limit(10)\
    .execute()

# Format for summary
key_votes = [{
    'm': 'good' if v['pro_environment'] else 'bad',
    't': v['bill_title'],
    'd': v['vote_date'],
    'bill': v['bill_id']
} for v in votes.data]
```

## Testing Plan

### Test 1: CSV Parsing
```bash
python fetch_lcv_votes.py --csv etl/data/lcv_votes_2025.csv --dry-run
# Should output: "Found X Senate votes, Y House votes"
```

### Test 2: Single Roll Call Fetch
```bash
python fetch_lcv_votes.py --csv etl/data/lcv_votes_2025.csv --chamber house --limit 1
# Should fetch one House vote and show matches
```

### Test 3: Full Chamber
```bash
python fetch_lcv_votes.py --csv etl/data/lcv_votes_2025.csv --chamber house
# Should process all House votes for 2025
```

### Test 4: Verify in App
```bash
npm run dev
# Navigate to politician detail page, check "Votes behind the score" panel
```

## File Structure After Implementation

```
etl/
├── data/
│   ├── lcv_votes_2024.csv      # Downloaded from LCV
│   ├── lcv_votes_2025.csv
│   └── lcv_data.csv            # Existing scores CSV
├── scripts/
│   ├── fetch_lcv_scores.py     # Existing - scores only
│   ├── fetch_lcv_votes.py      # NEW - voting records
│   └── aggregate_summaries.py  # Update to include votes
```

## Future Enhancements

1. **Historical data**: Fetch votes for 2020-2024 using archived LCV scorecards
2. **Automatic LCV scraping**: Scrape vote list from LCV website instead of manual CSV download
3. **Double-weighted votes**: LCV marks some votes as "2X Score" - could flag these
4. **Vote descriptions**: Scrape detailed vote descriptions from LCV vote pages

## Dependencies

No new dependencies needed. Uses:
- `requests` - already installed
- `xml.etree.ElementTree` - Python stdlib
- `csv` - Python stdlib
- `supabase` - already installed

## Estimated Effort

- Step 1 (ETL script): 2-3 hours
- Step 2 (pro-env logic): 1 hour
- Step 3 (Senate support): 1 hour
- Step 4 (upsert logic): 30 min
- Step 5 (aggregation): 30 min
- Testing: 1 hour

**Total: ~6-7 hours**
