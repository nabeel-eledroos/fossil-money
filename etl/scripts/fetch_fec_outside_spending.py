"""
Fetch independent expenditure data from FEC API (Schedule E).
This covers outside/dark money spending FOR or AGAINST candidates.

Usage:
  python fetch_fec_outside_spending.py              # Full fetch
  python fetch_fec_outside_spending.py --incremental # Last 48 hours
  python fetch_fec_outside_spending.py --limit 10   # Test with 10 politicians
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

FEC_API_KEY = os.environ.get('FEC_API_KEY')
FEC_BASE_URL = 'https://api.open.fec.gov/v1'
SUPABASE_URL = os.environ.get('SUPABASE_URL') or os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')

with open(CONFIG_DIR / 'fec_config.json') as f:
    FEC_CONFIG = json.load(f)

with open(CONFIG_DIR / 'fossil_fuel_sectors.json') as f:
    FOSSIL_CONFIG = json.load(f)

CYCLES = FEC_CONFIG.get('cycles', [2024, 2022, 2020])
REQUEST_DELAY = FEC_CONFIG.get('request_delay_seconds', 3.6)

FOSSIL_KEYWORDS = [kw.lower() for kw in FOSSIL_CONFIG.get('keywords', [])]
FOSSIL_COMPANIES = [c.lower() for c in FOSSIL_CONFIG.get('fossil_company_list', [])]

# Known fossil-aligned super PACs and dark money groups
FOSSIL_SPENDERS = [
    'american petroleum',
    'american fuel',
    'koch',
    'crossroads',
    'americans for prosperity',
    'american energy alliance',
    'power the future',
    'western energy alliance',
    'consumer energy alliance',
    'oil and gas',
    'petroleum',
    'coal',
    'mining',
    'pipeline',
    'energy citizens',
    'voices for energy'
]

def get_supabase():
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def load_fossil_committees():
    """Load the fossil fuel committee cache."""
    cache_path = DATA_DIR / 'fec_fossil_committees.json'
    if cache_path.exists():
        with open(cache_path) as f:
            data = json.load(f)
        return data.get('committees', {})
    return {}

def is_fossil_spender(spender_name, committee_id, fossil_committees):
    """Determine if a spender is fossil fuel aligned."""
    # Check committee cache
    if committee_id and committee_id in fossil_committees:
        return True
    
    # Check name patterns
    name_lower = (spender_name or '').lower()
    
    for pattern in FOSSIL_SPENDERS:
        if pattern in name_lower:
            return True
    
    for kw in FOSSIL_KEYWORDS:
        if kw in name_lower:
            return True
    
    for company in FOSSIL_COMPANIES:
        if company in name_lower:
            return True
    
    return False

def determine_spender_type(committee_type, filing_form):
    """Determine the type of outside spender."""
    if committee_type in ('O', 'U'):  # Super PAC
        return 'super_pac'
    if committee_type == 'V':  # Hybrid PAC
        return 'super_pac'
    if 'C4' in str(filing_form) or '501' in str(filing_form):
        return '501c4_dark'
    if committee_type in ('X', 'Y', 'Z'):  # Party
        return 'party'
    if committee_type in ('N', 'Q'):  # Trade association
        return 'trade_assoc'
    return 'other'

def fetch_schedule_e(candidate_id, cycle, last_index=None):
    """Fetch independent expenditures for a candidate."""
    params = {
        'api_key': FEC_API_KEY,
        'candidate_id': candidate_id,
        'cycle': cycle,
        'per_page': 100,
        'sort': '-expenditure_date'
    }
    
    if last_index:
        params['last_index'] = last_index
    
    r = requests.get(f'{FEC_BASE_URL}/schedules/schedule_e/', params=params, timeout=60)
    r.raise_for_status()
    return r.json()

def process_politician(supabase, politician, fossil_committees, cycles, incremental=False):
    """Fetch and store outside spending for a politician."""
    fec_id = politician.get('fec_candidate_id')
    pol_id = politician['id']
    
    if not fec_id:
        return 0, 0
    
    total_expenditures = 0
    fossil_expenditures = 0
    
    for cycle in cycles:
        last_index = None
        
        while True:
            try:
                data = fetch_schedule_e(fec_id, cycle, last_index)
                results = data.get('results', [])
                
                if not results:
                    break
                
                for exp in results:
                    upserted, is_fossil = process_expenditure(supabase, pol_id, exp, fossil_committees, cycle)
                    if upserted:
                        total_expenditures += 1
                        if is_fossil:
                            fossil_expenditures += 1
                
                # Pagination
                pagination = data.get('pagination', {})
                last_index = pagination.get('last_indexes', {}).get('last_index')
                
                if not last_index:
                    break
                
                time.sleep(REQUEST_DELAY)
                
            except requests.exceptions.RequestException as e:
                print(f"    Error fetching cycle {cycle}: {e}")
                time.sleep(10)
                break
        
        time.sleep(REQUEST_DELAY)
    
    return total_expenditures, fossil_expenditures

def process_expenditure(supabase, politician_id, exp, fossil_committees, cycle_year):
    """Process and upsert a single independent expenditure."""
    transaction_id = exp.get('transaction_id') or exp.get('sub_id')
    if not transaction_id:
        return False, False
    
    amount = exp.get('expenditure_amount', 0)
    if not amount or amount <= 0:
        return False, False
    
    spender_name = exp.get('committee', {}).get('name') or exp.get('committee_name', '')
    committee_id = exp.get('committee_id', '')
    
    is_fossil = is_fossil_spender(spender_name, committee_id, fossil_committees)
    
    # Only store fossil-aligned spending
    if not is_fossil:
        return False, False
    
    support_oppose = exp.get('support_oppose_indicator', '')
    if support_oppose == 'S':
        support_or_oppose = 'support'
    elif support_oppose == 'O':
        support_or_oppose = 'oppose'
    else:
        support_or_oppose = None
    
    record = {
        'politician_id': politician_id,
        'amount': amount,
        'spender_name': spender_name,
        'spender_type': determine_spender_type(
            exp.get('committee', {}).get('committee_type'),
            exp.get('filing_form')
        ),
        'support_or_oppose': support_or_oppose,
        'is_fossil_fuel': True,
        'cycle_year': cycle_year,
        'source': 'fec_schedule_e',
        'source_transaction_id': str(transaction_id),
        'source_url': exp.get('pdf_url')
    }
    
    try:
        existing = supabase.table('outside_spending').select('id').eq('source', 'fec_schedule_e').eq('source_transaction_id', str(transaction_id)).execute()
        
        if existing.data:
            supabase.table('outside_spending').update(record).eq('id', existing.data[0]['id']).execute()
        else:
            supabase.table('outside_spending').insert(record).execute()
        
        return True, True
    except Exception as e:
        return False, False

def main():
    parser = argparse.ArgumentParser(description='Fetch FEC independent expenditure data')
    parser.add_argument('--incremental', action='store_true', help='Only fetch recent data')
    parser.add_argument('--limit', type=int, help='Limit number of politicians')
    parser.add_argument('--cycle', type=int, help='Single cycle only')
    args = parser.parse_args()
    
    if not FEC_API_KEY:
        print("Error: FEC_API_KEY environment variable required")
        return
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY required")
        return
    
    supabase = get_supabase()
    fossil_committees = load_fossil_committees()
    
    print(f"Loaded {len(fossil_committees)} fossil fuel PACs from cache")
    
    cycles = [args.cycle] if args.cycle else CYCLES[:3]  # Default to recent 3 cycles
    
    # Get politicians
    result = supabase.table('politicians').select('id, name, fec_candidate_id').not_.is_('fec_candidate_id', 'null').execute()
    politicians = result.data
    
    if args.limit:
        politicians = politicians[:args.limit]
    
    print(f"Processing {len(politicians)} politicians for outside spending")
    print(f"Cycles: {cycles}")
    print()
    
    total_all = 0
    fossil_all = 0
    
    for i, pol in enumerate(politicians):
        print(f"[{i+1}/{len(politicians)}] {pol['name']}", flush=True)
        
        total, fossil = process_politician(supabase, pol, fossil_committees, cycles)
        
        total_all += total
        fossil_all += fossil
        
        if fossil > 0:
            print(f"    → {fossil} fossil-aligned expenditures", flush=True)
    
    print()
    print("=" * 50)
    print(f"Complete! Processed {len(politicians)} politicians")
    print(f"Total fossil outside spending records: {fossil_all}")

if __name__ == '__main__':
    main()
