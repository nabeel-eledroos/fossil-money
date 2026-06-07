# FEC Contributions ETL

Fetches campaign contribution data from the FEC API and classifies donations as fossil fuel, clean energy, or general.

## Quick Start

```bash
cd /path/to/fossil-money
source etl/venv/bin/activate

# Download progress from DB and run (safe to Ctrl+C anytime)
python etl/scripts/fetch_fec_contributions.py --download-progress --sync-db
```

## Command Options

| Flag | Description |
|------|-------------|
| `--download-progress` | Download and merge progress from Supabase before starting |
| `--sync-db` | Sync progress back to Supabase every 5 politicians |
| `--cycle YEAR` | Fetch single cycle only (e.g., `--cycle 2024`) |
| `--limit N` | Process only N politicians (for testing) |
| `--politician ID` | Fetch single politician by bioguide ID |
| `--incremental` | Only fetch last 48 hours (for nightly updates) |
| `--batch N` | Batch number for parallel processing (0-indexed) |
| `--total-batches N` | Total batches for parallel processing |

## Examples

```bash
# Full run with cloud sync (recommended for local runs)
python etl/scripts/fetch_fec_contributions.py --download-progress --sync-db

# Focus on 2024 cycle only (faster)
python etl/scripts/fetch_fec_contributions.py --download-progress --sync-db --cycle 2024

# Test with 5 politicians
python etl/scripts/fetch_fec_contributions.py --download-progress --limit 5

# Single politician
python etl/scripts/fetch_fec_contributions.py --politician P000197
```

## Safe Stop/Resume

The script is designed for safe interruption:

- **Donations are saved immediately** to Supabase as they're fetched
- **Progress saves every 5 politicians** to local file
- **With `--sync-db`**, progress also syncs to Supabase for cross-machine resume
- **Ctrl+C anytime** - next run will skip completed politicians

## Progress Tracking

Progress is stored in two places:

1. **Local file**: `etl/data/fec_fetch_progress.json`
2. **Supabase**: `etl_runs` table with `script = 'fec_progress'`

Use `--download-progress` to pull the latest from Supabase (merges all batch progress).

## Nightly GitHub Action

The workflow runs at 3am UTC daily with 4 parallel batches. Each batch has a 3-hour timeout.

Progress from all batches is merged in the post-fetch step.

To trigger manually: Actions → Nightly ETL → Run workflow

## Configuration

Edit `etl/config/fec_config.json`:

```json
{
  "cycles": [2024, 2022, 2020, 2018, 2016, 2014],
  "request_delay_seconds": 3.6,
  "min_contribution_amount": 500
}
```

- **cycles**: Election cycles to fetch
- **request_delay_seconds**: Delay between API calls (FEC rate limit: 1000/hour)
- **min_contribution_amount**: Skip contributions below this amount

## Required Environment Variables

Set in `.env.local`:

```
FEC_API_KEY=your_key_here
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=your_service_key
```

Get an FEC API key at: https://api.open.fec.gov/developers/
