"""
Fetch contribution data from FEC API (Schedule A).
Supports both initial full load and incremental nightly updates.

Usage:
  python fetch_fec_contributions.py              # Initial load (all cycles, resumable)
  python fetch_fec_contributions.py --incremental # Nightly: last 48 hours only
  python fetch_fec_contributions.py --politician P000197  # Single politician by bioguide
  python fetch_fec_contributions.py --limit 10   # Test with 10 politicians
"""
import os
import json
import time
import argparse
from datetime import datetime, timedelta
from pathlib import Path
import requests
from supabase import create_client
from dotenv import load_dotenv

# Load environment
env_paths = [
    Path(__file__).parent.parent / '.env',
    Path(__file__).parent.parent.parent / '.env',
    Path(__file__).parent.parent.parent / '.env.local',
]
for env_path in env_paths:
    if env_path.exists():
        load_dotenv(env_path)
        break

SCRIPT_DIR = Path(__file__).parent
CONFIG_DIR = SCRIPT_DIR.parent / 'config'
DATA_DIR = SCRIPT_DIR.parent / 'data'

# Config
FEC_API_KEY = os.environ.get('FEC_API_KEY')
FEC_BASE_URL = 'https://api.open.fec.gov/v1'
SUPABASE_URL = os.environ.get('SUPABASE_URL') or os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')

# Load configs
with open(CONFIG_DIR / 'fec_config.json') as f:
    FEC_CONFIG = json.load(f)

with open(CONFIG_DIR / 'fossil_fuel_sectors.json') as f:
    FOSSIL_CONFIG = json.load(f)

FOSSIL_KEYWORDS = [kw.lower() for kw in FOSSIL_CONFIG.get('keywords', [])]
FOSSIL_COMPANIES = [c.lower() for c in FOSSIL_CONFIG.get('fossil_company_list', [])]
CYCLES = FEC_CONFIG.get('cycles', [2024, 2022, 2020, 2018, 2016, 2014])
REQUEST_DELAY = FEC_CONFIG.get('request_delay_seconds', 3.6)
# Minimum contribution amount to fetch - filters out small donations at API level
# $200 is the FEC itemization threshold (below this, contributions aren't individually reported)
MIN_CONTRIBUTION_AMOUNT = FEC_CONFIG.get('min_contribution_amount', 200)

# Clean energy keywords to identify contrast donations
CLEAN_KEYWORDS = ['solar', 'wind', 'renewable', 'clean energy', 'green', 'climate action', 'environmental defense', 'sierra club', 'league of conservation']

def get_supabase():
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def load_fossil_committees():
    """Load the fossil fuel committee cache."""
    cache_path = DATA_DIR / 'fec_fossil_committees.json'
    if not cache_path.exists():
        print("Warning: Fossil committee cache not found. Run fetch_fec_committees.py first.")
        return {}
    
    with open(cache_path) as f:
        data = json.load(f)
    return data.get('committees', {})

def load_progress():
    """Load fetch progress for resumability."""
    progress_path = DATA_DIR / 'fec_fetch_progress.json'
    if progress_path.exists():
        with open(progress_path) as f:
            return json.load(f)
    return {'completed_politicians': {}, 'last_run': None}

def save_progress(progress, sync_to_db=False, supabase_client=None):
    """Save fetch progress to local file, optionally sync to Supabase."""
    progress_path = DATA_DIR / 'fec_fetch_progress.json'
    DATA_DIR.mkdir(exist_ok=True)
    with open(progress_path, 'w') as f:
        json.dump(progress, f, indent=2)
    
    if sync_to_db and supabase_client:
        try:
            supabase_client.table('etl_runs').insert({
                'script': 'fec_progress',
                'status': 'success',
                'rows_upserted': len(progress.get('completed_politicians', {})),
                'started_at': datetime.now().isoformat(),
                'finished_at': datetime.now().isoformat(),
                'notes': json.dumps(progress)
            }).execute()
        except Exception as e:
            print(f"    [Warning: Could not sync to DB: {e}]")

def download_progress_from_db(supabase_client):
    """Download and merge progress from Supabase DB."""
    try:
        # Get merged progress
        result = supabase_client.table('etl_runs').select('notes').eq('script', 'fec_progress').order('started_at', desc=True).limit(1).execute()
        
        if result.data and result.data[0].get('notes'):
            progress = json.loads(result.data[0]['notes'])
            print(f"Downloaded progress from DB: {len(progress.get('completed_politicians', {}))} politicians")
            
            # Also check individual batch progress (might be newer)
            for batch in range(4):
                batch_result = supabase_client.table('etl_runs').select('notes').eq('script', f'fec_progress_batch_{batch}').order('started_at', desc=True).limit(1).execute()
                if batch_result.data and batch_result.data[0].get('notes'):
                    batch_progress = json.loads(batch_result.data[0]['notes'])
                    for pol_id, data in batch_progress.get('completed_politicians', {}).items():
                        if pol_id not in progress['completed_politicians']:
                            progress['completed_politicians'][pol_id] = data
                        else:
                            existing_cycles = set(progress['completed_politicians'][pol_id].get('cycles', []))
                            new_cycles = set(data.get('cycles', []))
                            progress['completed_politicians'][pol_id]['cycles'] = list(existing_cycles | new_cycles)
            
            print(f"After merging batches: {len(progress.get('completed_politicians', {}))} politicians")
            return progress
        
        return {'completed_politicians': {}, 'last_run': None}
    except Exception as e:
        print(f"Error downloading progress: {e}")
        return {'completed_politicians': {}, 'last_run': None}

def guess_subsector(text: str) -> str:
    """Guess fossil fuel subsector from employer/occupation."""
    import re
    text = text.lower()
    # Use word boundary to avoid "coalition" matching "coal"
    if re.search(r'\bcoal\b', text) and 'coalition' not in text:
        return 'coal'
    if 'mining' in text:
        return 'mining'
    if any(x in text for x in ['utility', 'utilities', 'electric', 'power co']):
        return 'utilities'
    if any(x in text for x in ['pipeline', 'midstream']):
        return 'pipeline'
    if 'refin' in text:
        return 'refining'
    return 'oil_gas'

def classify_contribution(contrib, fossil_committees):
    """
    Classify a contribution as fossil fuel, clean energy, or neither.
    Returns: (is_fossil, is_clean, subsector)
    """
    # Get the contributing committee ID (for PAC-to-candidate transfers)
    contributor_obj = contrib.get('contributor') or {}
    contributor_committee_id = contributor_obj.get('committee_id') or ''
    
    employer = (contrib.get('contributor_employer') or '').lower()
    occupation = (contrib.get('contributor_occupation') or '').lower()
    contributor_name = (contrib.get('contributor_name') or '').lower()
    
    combined = f"{employer} {occupation} {contributor_name}"
    
    # Check clean energy first (to exclude from fossil)
    for kw in CLEAN_KEYWORDS:
        if kw in combined:
            return False, True, None
    
    # Check if contributing committee is a known fossil PAC
    if contributor_committee_id and contributor_committee_id in fossil_committees:
        return True, False, fossil_committees[contributor_committee_id].get('subsector', 'oil_gas')
    
    # Check employer against known fossil companies
    for company in FOSSIL_COMPANIES:
        if company in employer:
            return True, False, guess_subsector(employer)
    
    # Check contributor name (for PACs) against known fossil companies
    for company in FOSSIL_COMPANIES:
        if company in contributor_name:
            return True, False, guess_subsector(contributor_name)
    
    # Check keywords in employer/occupation/contributor name
    # Use word boundaries for short keywords to avoid false positives (coal vs coalition)
    import re
    for kw in FOSSIL_KEYWORDS:
        if len(kw) <= 4:  # Short keywords like "oil", "gas", "coal" need word boundaries
            pattern = r'\b' + re.escape(kw) + r'\b'
            if re.search(pattern, employer) or re.search(pattern, occupation) or re.search(pattern, contributor_name):
                # Extra check: exclude "coalition" for "coal"
                if kw == 'coal' and 'coalition' in combined:
                    continue
                return True, False, guess_subsector(combined)
        else:
            if kw in employer or kw in occupation or kw in contributor_name:
                return True, False, guess_subsector(combined)
    
    return False, False, None

def fetch_candidate_committee(fec_candidate_id, target_cycle=2024):
    """Get the principal campaign committee for a candidate (most recent cycle)."""
    params = {
        'api_key': FEC_API_KEY,
        'candidate_id': fec_candidate_id,
        'designation': 'P',  # Principal campaign committee
        'per_page': 10
    }
    
    r = requests.get(f'{FEC_BASE_URL}/candidate/{fec_candidate_id}/committees/', params=params, timeout=30)
    r.raise_for_status()
    data = r.json()
    
    results = data.get('results', [])
    if not results:
        return None
    
    # Find committee that covers the target cycle (or most recent)
    for committee in results:
        cycles = committee.get('cycles', [])
        if target_cycle in cycles:
            return committee.get('committee_id')
    
    # Fallback: return the one with the most recent cycle
    best = max(results, key=lambda c: max(c.get('cycles', [0])))
    return best.get('committee_id')

def fetch_schedule_a(committee_id, cycle, last_index=None, last_contribution_receipt_date=None, min_amount=None):
    """Fetch a page of Schedule A contributions (ALL types - individuals and PACs)."""
    params = {
        'api_key': FEC_API_KEY,
        'committee_id': committee_id,
        'two_year_transaction_period': cycle,
        'per_page': 100,
        'sort': '-contribution_receipt_date',
        # NOTE: Removed is_individual filter to capture PAC contributions
        # PAC contributions are where most fossil fuel money comes from
    }
    
    # Add minimum amount filter to reduce API calls dramatically
    if min_amount:
        params['min_amount'] = min_amount
    
    if last_index:
        params['last_index'] = last_index
        params['last_contribution_receipt_date'] = last_contribution_receipt_date
    
    r = requests.get(f'{FEC_BASE_URL}/schedules/schedule_a/', params=params, timeout=60)
    r.raise_for_status()
    return r.json()

def fetch_schedule_a_by_contributor(committee_id, min_date=None):
    """Fetch recent Schedule A contributions (for incremental updates)."""
    params = {
        'api_key': FEC_API_KEY,
        'committee_id': committee_id,
        'per_page': 100,
        'sort': '-contribution_receipt_date',
    }
    
    if min_date:
        params['min_date'] = min_date.strftime('%Y-%m-%d')
    
    r = requests.get(f'{FEC_BASE_URL}/schedules/schedule_a/', params=params, timeout=60)
    r.raise_for_status()
    return r.json()

def process_politician(supabase, politician, fossil_committees, cycles, incremental=False):
    """Fetch and store contributions for a single politician."""
    fec_id = politician.get('fec_candidate_id')
    pol_id = politician['id']
    name = politician['name']
    
    if not fec_id:
        return 0, 0
    
    # Get their principal campaign committee
    try:
        committee_id = fetch_candidate_committee(fec_id)
        if not committee_id:
            print(f"    No committee found for {fec_id}")
            return 0, 0
    except Exception as e:
        print(f"    Error getting committee for {fec_id}: {e}")
        return 0, 0
    
    time.sleep(REQUEST_DELAY)
    
    total_contributions = 0
    fossil_contributions = 0
    
    if incremental:
        # Fetch only last 48 hours
        min_date = datetime.now() - timedelta(hours=48)
        try:
            data = fetch_schedule_a_by_contributor(committee_id, min_date)
            results = data.get('results', [])
            
            for contrib in results:
                upserted, is_fossil = process_contribution(supabase, pol_id, contrib, fossil_committees)
                if upserted:
                    total_contributions += 1
                    if is_fossil:
                        fossil_contributions += 1
            
            time.sleep(REQUEST_DELAY)
            
        except Exception as e:
            print(f"    Error fetching recent contributions: {e}")
    else:
        # Full fetch for all cycles
        for cycle in cycles:
            last_index = None
            last_date = None
            cycle_count = 0
            
            while True:
                try:
                    data = fetch_schedule_a(committee_id, cycle, last_index, last_date, min_amount=MIN_CONTRIBUTION_AMOUNT)
                    results = data.get('results', [])
                    
                    if not results:
                        break
                    
                    for contrib in results:
                        upserted, is_fossil = process_contribution(supabase, pol_id, contrib, fossil_committees, cycle)
                        if upserted:
                            total_contributions += 1
                            cycle_count += 1
                            if is_fossil:
                                fossil_contributions += 1
                    
                    # Pagination
                    pagination = data.get('pagination', {})
                    last_index = pagination.get('last_indexes', {}).get('last_index')
                    last_date = pagination.get('last_indexes', {}).get('last_contribution_receipt_date')
                    
                    if not last_index or pagination.get('page', 1) >= pagination.get('pages', 1):
                        break
                    
                    time.sleep(REQUEST_DELAY)
                    
                except requests.exceptions.RequestException as e:
                    print(f"    Error fetching cycle {cycle}: {e}")
                    time.sleep(10)
                    break
            
            if cycle_count > 0:
                print(f"      {cycle}: {cycle_count} contributions", flush=True)
    
    return total_contributions, fossil_contributions

def process_contribution(supabase, politician_id, contrib, fossil_committees, cycle_year=None):
    """Process and upsert a single contribution."""
    transaction_id = contrib.get('transaction_id') or contrib.get('sub_id')
    if not transaction_id:
        return False, False
    
    amount = contrib.get('contribution_receipt_amount', 0)
    if not amount or amount <= 0:
        return False, False
    
    is_fossil, is_clean, subsector = classify_contribution(contrib, fossil_committees)
    
    # Store ALL contributions that are either:
    # 1. Fossil fuel related
    # 2. Clean energy related  
    # 3. From PACs/committees (could be fossil-aligned, need for total_raised calc)
    # 4. Large individual contributions ($1000+, useful for donor analysis)
    entity_type = contrib.get('entity_type', '')
    is_pac_or_committee = entity_type in ('COM', 'PAC', 'PTY', 'CCM', 'ORG')
    is_large_individual = amount >= 1000 and entity_type == 'IND'
    
    if not is_fossil and not is_clean and not is_pac_or_committee and not is_large_individual:
        return False, False
    
    # Determine donor type (entity_type already extracted above)
    if is_pac_or_committee:
        donor_type = 'PAC'
    else:
        donor_type = 'Individual'
    
    # Build donation record
    donation = {
        'politician_id': politician_id,
        'amount': amount,
        'donor_name': contrib.get('contributor_name') or contrib.get('committee', {}).get('name'),
        'donor_type': donor_type,
        'employer': contrib.get('contributor_employer'),
        'industry_subsector': subsector,
        'is_fossil_fuel': is_fossil,
        'is_clean_energy': is_clean,
        'cycle_year': cycle_year or contrib.get('two_year_transaction_period'),
        'contribution_date': contrib.get('contribution_receipt_date'),
        'contributor_city': contrib.get('contributor_city'),
        'contributor_state': contrib.get('contributor_state'),
        'committee_name': contrib.get('committee', {}).get('name'),
        'fec_committee_id': contrib.get('committee_id'),
        'fec_file_number': str(contrib.get('file_number', '')),
        'source': 'fec',
        'source_transaction_id': str(transaction_id),
        'source_url': contrib.get('pdf_url')
    }
    
    # Upsert
    try:
        existing = supabase.table('donations').select('id').eq('source', 'fec').eq('source_transaction_id', str(transaction_id)).execute()
        
        if existing.data:
            supabase.table('donations').update(donation).eq('id', existing.data[0]['id']).execute()
        else:
            supabase.table('donations').insert(donation).execute()
        
        return True, is_fossil
    except Exception as e:
        # Likely duplicate, skip
        return False, False

def main():
    parser = argparse.ArgumentParser(description='Fetch FEC contribution data')
    parser.add_argument('--incremental', action='store_true', help='Only fetch last 48 hours')
    parser.add_argument('--politician', type=str, help='Fetch single politician by bioguide ID')
    parser.add_argument('--limit', type=int, help='Limit number of politicians to process')
    parser.add_argument('--cycle', type=int, help='Fetch single cycle only')
    parser.add_argument('--resume', action='store_true', help='Resume from last progress (default: True)')
    parser.add_argument('--batch', type=int, help='Batch number (0-indexed) for parallel processing')
    parser.add_argument('--total-batches', type=int, default=1, help='Total number of batches for parallel processing')
    parser.add_argument('--sync-db', action='store_true', help='Sync progress to Supabase DB (for local runs)')
    parser.add_argument('--download-progress', action='store_true', help='Download latest progress from Supabase before starting')
    args = parser.parse_args()
    
    if not FEC_API_KEY:
        print("Error: FEC_API_KEY environment variable required")
        print("Get a free key at: https://api.open.fec.gov/developers/")
        return
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY required")
        return
    
    supabase = get_supabase()
    fossil_committees = load_fossil_committees()
    
    # Load progress - optionally download from DB first
    if args.download_progress:
        print("Downloading progress from Supabase DB...")
        progress = download_progress_from_db(supabase)
        # Save locally for future use
        save_progress(progress)
    else:
        progress = load_progress()
    
    print(f"Loaded {len(fossil_committees)} fossil fuel PACs from cache")
    print(f"Current progress: {len(progress.get('completed_politicians', {}))} politicians completed")
    
    # Determine cycles to fetch
    cycles = [args.cycle] if args.cycle else CYCLES
    
    # Get politicians to process
    if args.politician:
        result = supabase.table('politicians').select('id, name, fec_candidate_id, bioguide_id').eq('bioguide_id', args.politician).execute()
        politicians = result.data
    else:
        result = supabase.table('politicians').select('id, name, fec_candidate_id, bioguide_id').not_.is_('fec_candidate_id', 'null').execute()
        politicians = result.data
    
    if not politicians:
        print("No politicians with FEC IDs found")
        return
    
    # Filter already completed (unless incremental)
    if not args.incremental and not args.politician:
        completed = set(progress.get('completed_politicians', {}).keys())
        # Only skip if completed for ALL requested cycles
        politicians = [p for p in politicians if p['id'] not in completed or 
                      not all(str(c) in progress['completed_politicians'].get(p['id'], {}).get('cycles', []) for c in cycles)]
    
    # Sort by name for consistent batching across runs
    politicians = sorted(politicians, key=lambda p: p['name'])
    
    # Apply batch filtering for parallel processing
    if args.batch is not None and args.total_batches > 1:
        batch_size = len(politicians) // args.total_batches
        start_idx = args.batch * batch_size
        # Last batch gets any remainder
        end_idx = len(politicians) if args.batch == args.total_batches - 1 else start_idx + batch_size
        politicians = politicians[start_idx:end_idx]
        print(f"Batch {args.batch + 1}/{args.total_batches}: processing politicians {start_idx + 1} to {end_idx}")
    
    if args.limit:
        politicians = politicians[:args.limit]
    
    print(f"Processing {len(politicians)} politicians")
    print(f"Cycles: {cycles}")
    print(f"Mode: {'Incremental (last 48h)' if args.incremental else 'Full fetch'}")
    print()
    
    total_all = 0
    fossil_all = 0
    
    for i, pol in enumerate(politicians):
        print(f"[{i+1}/{len(politicians)}] {pol['name']} ({pol.get('bioguide_id', 'no-bioguide')})", flush=True)
        
        total, fossil = process_politician(supabase, pol, fossil_committees, cycles, args.incremental)
        
        total_all += total
        fossil_all += fossil
        
        if total > 0:
            print(f"    → {total} contributions ({fossil} fossil fuel)", flush=True)
        
        # Update progress
        if not args.incremental:
            if pol['id'] not in progress['completed_politicians']:
                progress['completed_politicians'][pol['id']] = {'cycles': []}
            progress['completed_politicians'][pol['id']]['cycles'] = list(set(
                progress['completed_politicians'][pol['id']].get('cycles', []) + [str(c) for c in cycles]
            ))
            progress['completed_politicians'][pol['id']]['last_updated'] = datetime.now().isoformat()
            progress['last_run'] = datetime.now().isoformat()
            
            # Save progress after each politician (safe stop/resume)
            save_progress(progress)
            
            # Sync to DB every 5 politicians (reduces API calls while keeping cloud backup)
            if args.sync_db and (i + 1) % 5 == 0:
                save_progress(progress, sync_to_db=True, supabase_client=supabase)
                print(f"    [Progress synced to DB: {len(progress['completed_politicians'])} politicians complete]", flush=True)
    
    # Final save
    save_progress(progress, sync_to_db=args.sync_db, supabase_client=supabase)
    
    print()
    print("=" * 50)
    print(f"Complete! Processed {len(politicians)} politicians")
    print(f"Total contributions: {total_all}")
    print(f"Fossil fuel contributions: {fossil_all}")
    print()
    print("Next steps:")
    print("  1. Run: python aggregate_summaries.py")
    print("  2. Verify in app: npm run dev")

if __name__ == '__main__':
    main()
