"""
Fetch candidate financial totals from FEC API.
Updates politicians.total_raised for accurate "% of funding" calculation.

Usage:
  python fetch_fec_totals.py              # Update all politicians
  python fetch_fec_totals.py --limit 10   # Test with 10 politicians
"""
import os
import time
import argparse
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

FEC_API_KEY = os.environ.get('FEC_API_KEY')
FEC_BASE_URL = 'https://api.open.fec.gov/v1'
SUPABASE_URL = os.environ.get('SUPABASE_URL') or os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')

REQUEST_DELAY = 3.6  # Stay under 1000 calls/hour

def get_supabase():
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def fetch_candidate_totals(fec_candidate_id, cycle=2024):
    """Fetch total raised for a candidate from FEC."""
    params = {
        'api_key': FEC_API_KEY,
        'candidate_id': fec_candidate_id,
        'cycle': cycle,
        'per_page': 1
    }
    
    r = requests.get(f'{FEC_BASE_URL}/candidates/totals/', params=params, timeout=30)
    r.raise_for_status()
    data = r.json()
    
    results = data.get('results', [])
    if results:
        return results[0]
    return None

def main():
    parser = argparse.ArgumentParser(description='Fetch FEC candidate totals')
    parser.add_argument('--limit', type=int, help='Limit number of politicians')
    parser.add_argument('--cycle', type=int, default=2024, help='Election cycle (default: 2024)')
    args = parser.parse_args()
    
    if not FEC_API_KEY:
        print("Error: FEC_API_KEY environment variable required")
        return
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY required")
        return
    
    supabase = get_supabase()
    
    # Get politicians with FEC IDs
    result = supabase.table('politicians').select('id, name, fec_candidate_id, total_raised').not_.is_('fec_candidate_id', 'null').execute()
    politicians = result.data
    
    if args.limit:
        politicians = politicians[:args.limit]
    
    print(f"Fetching totals for {len(politicians)} politicians (cycle {args.cycle})")
    print()
    
    updated = 0
    errors = 0
    
    for i, pol in enumerate(politicians):
        try:
            totals = fetch_candidate_totals(pol['fec_candidate_id'], args.cycle)
            
            if totals:
                total_raised = totals.get('receipts', 0) or 0
                
                # Update politician record
                supabase.table('politicians').update({
                    'total_raised': total_raised
                }).eq('id', pol['id']).execute()
                
                if (i + 1) % 25 == 0 or total_raised > 1000000:
                    print(f"[{i+1}/{len(politicians)}] {pol['name']}: ${total_raised:,.0f}", flush=True)
                
                updated += 1
            else:
                print(f"[{i+1}/{len(politicians)}] {pol['name']}: No data found")
            
            time.sleep(REQUEST_DELAY)
            
        except requests.exceptions.RequestException as e:
            print(f"[{i+1}/{len(politicians)}] {pol['name']}: Error - {e}")
            errors += 1
            if errors >= 5:
                print("Too many errors, stopping")
                break
            time.sleep(10)
    
    print()
    print("=" * 50)
    print(f"Complete! Updated {updated} politicians")
    if errors:
        print(f"Errors: {errors}")

if __name__ == '__main__':
    main()
