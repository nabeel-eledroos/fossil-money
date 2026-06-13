# Fossil Money Architecture

## Overview

Fossil Money is a Next.js application that shows users which politicians represent them and how much fossil fuel money those politicians have received. It combines data from multiple sources (FEC, LCV, NFFM) into a Supabase database, pre-computes summaries via ETL, and serves them through API routes to the frontend.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA SOURCES                                    │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────────────────┤
│ FEC API     │ Congress    │ LCV         │ NFFM        │ Census              │
│ (donations) │ Legislators │ (scores)    │ (pledges)   │ (ZIP→district)      │
└──────┬──────┴──────┬──────┴──────┬──────┴──────┬──────┴──────┬──────────────┘
       │             │             │             │             │
       ▼             ▼             ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ETL LAYER (Python)                                 │
│  etl/scripts/                                                                │
│  ├── fetch_fec_contributions.py  ─┐                                          │
│  ├── fetch_fec_committees.py     ─┼── Donations + Classification             │
│  ├── fetch_congress_members.py   ─┘                                          │
│  ├── fetch_lcv_scores.py         ─── LCV Scores                              │
│  ├── fetch_nffm_pledges.py       ─── Pledge Status                           │
│  ├── fetch_zip_districts.py      ─── Geographic Lookup                       │
│  └── aggregate_summaries.py      ─── Pre-compute per-politician stats        │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SUPABASE (PostgreSQL)                                │
│  Core Tables:                                                                │
│  ├── politicians          (officials: name, party, chamber, state, photo)    │
│  ├── donations            (contribution records, classified fossil/clean)    │
│  ├── lcv_scores           (environmental voting scores by year)              │
│  ├── politician_summaries (pre-computed aggregates for fast reads)           │
│  ├── homepage_stats       (national totals for landing page)                 │
│  ├── zip_to_district      (ZIP → congressional district mapping)             │
│  └── coverage             (which levels are live: federal/state/local)       │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         API LAYER (Next.js Routes)                           │
│  src/app/api/                                                                │
│  ├── reps/route.ts           GET /api/reps?zip=XXXXX                         │
│  ├── politician/[id]/route.ts GET /api/politician/:id                        │
│  ├── stats/national/route.ts  GET /api/stats/national                        │
│  └── og/[id]/route.tsx        GET /api/og/:id (OpenGraph images)             │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React/Next.js)                             │
│  src/app/                                                                    │
│  ├── page.tsx                 Landing page with ZIP search + national stats  │
│  ├── results/[zip]/page.tsx   Results page showing your representatives      │
│  └── politician/[id]/page.tsx Detailed profile for a single politician       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Layer 1: Database Schema (Supabase/PostgreSQL)

Location: `supabase/migrations/`

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `politicians` | All elected officials | `id`, `name`, `party`, `chamber`, `state`, `district`, `bioguide_id`, `fec_candidate_id`, `photo_url`, `pledge_status`, `total_raised` |
| `donations` | Individual contribution records | `politician_id`, `amount`, `donor_name`, `donor_type` (PAC/Individual), `is_fossil_fuel`, `is_clean_energy`, `industry_subsector`, `classification_method`, `cycle_year` |
| `lcv_scores` | Environmental voting scores | `politician_id`, `score` (0-100), `year`, `scope` (national/state) |
| `politician_summaries` | Pre-computed aggregates (READ-OPTIMIZED) | `politician_id`, `total_fossil_fuel_donations`, `fossil_pct`, `subsector_breakdown`, `pac_vs_individual`, `top_donors`, `latest_lcv_score`, `flagged` |
| `homepage_stats` | National aggregate stats | `total_fossil_fuel_donations`, `fossil_pct_of_total`, `pledge_signers`, `officials_tracked` |
| `zip_to_district` | ZIP code lookup | `zip_code`, `state`, `congressional_district` |
| `coverage` | Which data levels are live | `level` (federal/state/local), `scope`, `status` (live/pending) |

### Key Relationships

```
politicians (1) ──────< donations (many)
politicians (1) ──────< lcv_scores (many)
politicians (1) ──────< politician_summaries (1)
zip_to_district ─────── Used to find politicians by ZIP
```

### Schema Migrations

Run in order:
1. `001_schema_v2.sql` - Full schema with all tables
2. `002_homepage_stats.sql` - Homepage statistics table
3. `003_coverage.sql` - Coverage tracking
4. `004_fec_enhancements.sql` - Additional FEC fields
5. `005_cleanup_non_fossil_donations.sql` - Remove non-classified donations
6. `006_classification_method.sql` - Track how donations were classified
7. `007_cleanup_false_positives.sql` - Remove misclassified donations

---

## Layer 2: ETL Pipeline (Python)

Location: `etl/scripts/`

### Script Dependency Order

```
1. fetch_congress_members.py    ← Run first (creates politicians)
2. fetch_zip_districts.py       ← Run once (ZIP lookup data)
3. fetch_fec_committees.py      ← Run once (builds fossil PAC cache)
4. fetch_fec_contributions.py   ← Main data fetch (takes days for full run)
5. fetch_lcv_scores.py          ← Requires manual CSV download
6. fetch_nffm_pledges.py        ← Updates pledge status
7. aggregate_summaries.py       ← ALWAYS run last (computes summaries)
```

### Script Details

#### `fetch_congress_members.py`
- **Source**: GitHub `unitedstates/congress-legislators` YAML
- **Writes to**: `politicians` table
- **Key fields**: name, party, chamber, state, district, bioguide_id, fec_candidate_id, photo_url
- **Run frequency**: Whenever Congress membership changes

#### `fetch_fec_contributions.py`
- **Source**: FEC API (Schedule A contributions)
- **Writes to**: `donations` table, updates `politicians.total_raised`
- **Classification logic**:
  1. OpenSecrets verified PAC list (most reliable)
  2. Cached fossil committee list (`fec_fossil_committees.json`)
  3. Known fossil company names (`fossil_fuel_sectors.json`)
  4. Keyword matching (least reliable)
- **Supports**: `--incremental` (last 48h), `--politician X`, `--batch N`
- **Progress**: Saves to `etl/data/fec_fetch_progress.json` for resume

#### `fetch_fec_committees.py`
- **Source**: FEC API committee registry
- **Writes to**: `etl/data/fec_fossil_committees.json` (local cache)
- **Purpose**: Pre-identify which PACs are fossil fuel related
- **Run frequency**: Periodically to catch new PACs

#### `fetch_lcv_scores.py`
- **Source**: LCV Scorecard CSV (manual download required)
- **Writes to**: `lcv_scores` table
- **Note**: Set `LCV_CSV_PATH` env var to CSV location

#### `fetch_nffm_pledges.py`
- **Source**: Hardcoded list of bioguide IDs
- **Writes to**: `politicians.pledge_status`, `politicians.signed_nffm_pledge`
- **Note**: Update `PLEDGE_SIGNERS` list manually

#### `aggregate_summaries.py`
- **Source**: Reads from `donations`, `lcv_scores`, `outside_spending`
- **Writes to**: `politician_summaries`, `homepage_stats`
- **Purpose**: Pre-compute all aggregates so API reads are fast
- **CRITICAL**: Run after any data changes

### Configuration Files

Location: `etl/config/`

| File | Purpose |
|------|---------|
| `fossil_fuel_sectors.json` | Keywords, company names, exclusions for classification |
| `fec_config.json` | FEC API settings, cycle years, rate limits |
| `aggregate_config.json` | Scope labels, cycle windows |

### Data Files (Generated)

Location: `etl/data/`

| File | Purpose |
|------|---------|
| `fec_fossil_committees.json` | Cached list of fossil fuel PACs |
| `fec_fetch_progress.json` | Resume state for long-running FEC fetch |
| `opensecrets_oil_gas_pacs.json` | Verified PACs from OpenSecrets |

---

## Layer 3: API Routes (Next.js)

Location: `src/app/api/`

### `GET /api/reps?zip=XXXXX`

**File**: `src/app/api/reps/route.ts`

**Flow**:
1. Look up ZIP in `zip_to_division` or fallback to `zip_to_district`
2. Extract state and district from OCD ID
3. Query `politicians` + `politician_summaries` for that state/district
4. Return `RepsResponse` with federal/state/local officials grouped

**Response shape**:
```typescript
{
  zip: string
  state: string
  coverage: { federal: 'live'|'pending', state: '...', local: '...' }
  officials: {
    federal: RepCard[]
    state: RepCard[]
    local: RepCard[]
  }
}
```

### `GET /api/politician/:id`

**File**: `src/app/api/politician/[id]/route.ts`

**Flow**:
1. Fetch politician by UUID with joins to `politician_summaries`, `donations`, `lcv_scores`
2. If summary has pre-computed `profile`, return it
3. Otherwise compute profile on-the-fly from raw data
4. Return `PoliticianProfile` with all detail page data

**Response shape**:
```typescript
{
  profile: {
    id, name, office, party, state, photoUrl,
    fossilDirect, fossilPct, totalRaised,
    lcv, lcvHist, pledge,
    subIndustry, donorSplit, yearly, donors,
    // ... more fields
  }
}
```

### `GET /api/stats/national`

**File**: `src/app/api/stats/national/route.ts`

**Flow**:
1. Read single row from `homepage_stats` (id=1)
2. Return `NationalStats` for landing page

---

## Layer 4: Frontend (React)

Location: `src/app/`

### Pages

| Route | File | Purpose |
|-------|------|---------|
| `/` | `page.tsx` | Landing page: ZIP search, national stats, methodology |
| `/results/[zip]` | `results/[zip]/page.tsx` | Shows all reps for a ZIP code |
| `/politician/[id]` | `politician/[id]/page.tsx` | Detailed profile for one politician |

### Data Flow (Results Page)

```
User enters ZIP
      │
      ▼
fetch('/api/reps?zip=94110')
      │
      ▼
API queries Supabase:
  - zip_to_district → find state/district
  - politicians + politician_summaries → get officials
      │
      ▼
Returns RepsResponse
      │
      ▼
Frontend renders:
  - Federal tier (Senators + House rep)
  - State tier (coming soon)
  - Local tier (coming soon)
  Each official as a PoliticianCard component
```

### Data Flow (Politician Detail Page)

```
User clicks "Full profile"
      │
      ▼
fetch('/api/politician/{id}')
      │
      ▼
API queries Supabase:
  - politicians (base info)
  - politician_summaries (aggregates)
  - donations (for detailed breakdown)
  - lcv_scores (for history chart)
      │
      ▼
Returns PoliticianProfile
      │
      ▼
Frontend renders:
  - Header (photo, name, office, pledge status)
  - Key stats (fossil $, %, outside money, LCV)
  - Charts (money over time, industry breakdown)
  - Top donors list
  - Email composer for constituent action
```

### Component Structure

```
src/components/
├── domain/           # Business-specific components
│   ├── RepCard.tsx           # (old design, not currently used)
│   ├── FossilFuelAmount.tsx
│   ├── LcvTrendBadge.tsx
│   ├── PledgeBadge.tsx
│   ├── ContactButton.tsx
│   ├── ShareButton.tsx
│   └── DarkMoneyDisclaimer.tsx
├── ui/               # Generic UI primitives
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Card.tsx
│   ├── Badge.tsx
│   └── ProgressBar.tsx
├── forms/
│   └── ZipSearchForm.tsx
└── layout/
    ├── Header.tsx
    ├── Footer.tsx
    └── PageContainer.tsx
```

**Note**: The results and politician pages have their own inline components (`PoliticianCard`, `LcvGauge`, etc.) rather than using the `src/components/domain` components.

---

## Layer 5: Types

Location: `src/lib/database.types.ts`

Key types:
- `RepCard` - Card data for results page
- `PoliticianProfile` - Full profile for detail page
- `RepsResponse` - API response for `/api/reps`
- `NationalStats` - Homepage statistics

---

## Common Tasks

### Add a new politician field

1. Add column in new migration: `supabase/migrations/00X_*.sql`
2. Update type in `src/lib/database.types.ts`
3. Update ETL script that populates it
4. Update API route to return it
5. Update frontend to display it
6. Run `aggregate_summaries.py` if it affects summaries

### Change fossil fuel classification

1. Edit `etl/config/fossil_fuel_sectors.json`:
   - `fossil_company_list` - Known companies
   - `keywords` - Multi-word phrases
   - `keyword_exclusions` - False positive prevention
   - `name_exclusions` - Names to never match
2. Optionally rebuild committee cache: `python fetch_fec_committees.py --refresh`
3. Write SQL migration to fix existing data
4. Run `aggregate_summaries.py`

### Add a new data source

1. Create `etl/scripts/fetch_new_source.py`
2. Add any new tables via migration
3. Update `aggregate_summaries.py` to incorporate new data
4. Add config file if needed in `etl/config/`

### Debug why a politician shows wrong data

1. Check raw data: Query `donations` table filtered by `politician_id`
2. Check classification: Look at `classification_method` column
3. Check summary: Query `politician_summaries` for pre-computed values
4. Re-run aggregation: `python aggregate_summaries.py`

---

## Environment Variables

### Frontend (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...  # For API routes
```

### ETL (`etl/.env` or project root `.env`)
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
FEC_API_KEY=your-fec-api-key
LCV_CSV_PATH=etl/data/lcv_data.csv  # Optional
```

---

## Deployment

- **Frontend**: Vercel (auto-deploys from main branch)
- **Database**: Supabase (hosted PostgreSQL)
- **ETL**: Run manually or via cron on a server/droplet

### ETL Run Order for Fresh Deploy

```bash
cd etl
python scripts/fetch_congress_members.py     # Politicians
python scripts/fetch_zip_districts.py        # ZIP lookup
python scripts/fetch_fec_committees.py       # PAC cache
python scripts/fetch_fec_contributions.py    # Donations (long!)
python scripts/fetch_lcv_scores.py           # LCV (needs CSV)
python scripts/fetch_nffm_pledges.py         # Pledges
python scripts/aggregate_summaries.py        # Summaries
```
