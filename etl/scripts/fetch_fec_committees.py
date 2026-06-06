"""
Fetch and classify FEC committees as fossil fuel or not.
Builds a local cache of fossil fuel PACs for contribution classification.
Run once, then periodically refresh.
"""
import os
import json
import time
import requests
from pathlib import Path
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

# Load fossil fuel config
with open(CONFIG_DIR / 'fossil_fuel_sectors.json') as f:
    FOSSIL_CONFIG = json.load(f)

FOSSIL_KEYWORDS = [kw.lower() for kw in FOSSIL_CONFIG.get('keywords', [])]
FOSSIL_COMPANIES = [c.lower() for c in FOSSIL_CONFIG.get('fossil_company_list', [])]

# Additional PAC-specific keywords
# Note: Short words need careful handling to avoid false positives (e.g., "coal" in "coalition")
PAC_KEYWORDS = [
    'petroleum', 'oil & gas', 'oil and gas', 'mining', 'pipeline', 'refin',
    'drilling', 'fracking', 'energy transfer', 'midstream', 'upstream',
    'exploration', 'natural gas', 'lng', 'propane', 'diesel',
    'gasoline', 'offshore', 'wellhead', 'derrick'
]

# Keywords that need word boundary matching
PAC_KEYWORDS_STRICT = ['oil', 'gas', 'coal', 'fuel']

# Known clean energy keywords to exclude
CLEAN_KEYWORDS = [
    'solar', 'wind', 'renewable', 'clean energy', 'green energy',
    'climate', 'environmental', 'conservation', 'sierra', 'league of conservation'
]

def is_fossil_committee(name: str) -> tuple:
    """Determine if a committee name indicates fossil fuel industry."""
    import re
    name_lower = name.lower()
    
    # Exclude clean energy
    for kw in CLEAN_KEYWORDS:
        if kw in name_lower:
            return False, None
    
    # Check against known fossil companies (most reliable)
    for company in FOSSIL_COMPANIES:
        if company in name_lower:
            return True, guess_subsector(name_lower)
    
    # Check PAC keywords (longer, less ambiguous)
    for kw in PAC_KEYWORDS:
        if kw in name_lower:
            return True, guess_subsector(name_lower)
    
    # Check strict keywords with word boundaries
    for kw in PAC_KEYWORDS_STRICT:
        pattern = r'\b' + re.escape(kw) + r'\b'
        if re.search(pattern, name_lower):
            # Extra exclusions for common false positives
            if kw == 'coal' and 'coalition' in name_lower:
                continue
            if kw == 'gas' and any(x in name_lower for x in ['vegas', 'gaspar']):
                continue
            return True, guess_subsector(name_lower)
    
    return False, None

def guess_subsector(name: str) -> str:
    """Guess the fossil fuel subsector from name."""
    import re
    name = name.lower()
    # Use word boundary for "coal" to avoid "coalition"
    if re.search(r'\bcoal\b', name) and 'coalition' not in name:
        return 'coal'
    if 'mining' in name:
        return 'mining'
    if 'utility' in name or 'utilities' in name or 'electric' in name or 'power' in name:
        return 'utilities'
    if 'pipeline' in name or 'midstream' in name:
        return 'pipeline'
    if 'refin' in name:
        return 'refining'
    return 'oil_gas'

def fetch_committees(page=1):
    """Fetch a page of PAC committees from FEC."""
    params = {
        'api_key': FEC_API_KEY,
        'committee_type': ['N', 'Q', 'O', 'V', 'W'],  # PACs, Super PACs, etc.
        'per_page': 100,
        'page': page,
        'sort': 'name'
    }
    
    r = requests.get(f'{FEC_BASE_URL}/committees/', params=params, timeout=30)
    r.raise_for_status()
    return r.json()

def build_fossil_committee_cache():
    """Build cache of fossil fuel committees."""
    if not FEC_API_KEY:
        print("Error: FEC_API_KEY environment variable required")
        print("Get a free key at: https://api.open.fec.gov/developers/")
        return
    
    print("Building fossil fuel committee cache...")
    print("This will scan FEC PAC registry. May take 30-60 minutes.")
    print()
    
    fossil_committees = {}
    page = 1
    total_scanned = 0
    
    while True:
        try:
            data = fetch_committees(page)
            results = data.get('results', [])
            
            if not results:
                break
            
            for c in results:
                committee_id = c.get('committee_id')
                name = c.get('name', '')
                
                is_fossil, subsector = is_fossil_committee(name)
                
                if is_fossil:
                    fossil_committees[committee_id] = {
                        'name': name,
                        'subsector': subsector,
                        'committee_type': c.get('committee_type'),
                        'designation': c.get('designation')
                    }
            
            total_scanned += len(results)
            
            if page % 10 == 0:
                print(f"  Scanned {total_scanned} committees, found {len(fossil_committees)} fossil fuel PACs...", flush=True)
            
            pagination = data.get('pagination', {})
            if page >= pagination.get('pages', 1):
                break
            
            page += 1
            time.sleep(0.5)  # Be nice to the API
            
        except requests.exceptions.RequestException as e:
            print(f"  Error on page {page}: {e}")
            time.sleep(5)
            continue
    
    # Save cache
    DATA_DIR.mkdir(exist_ok=True)
    cache_path = DATA_DIR / 'fec_fossil_committees.json'
    
    with open(cache_path, 'w') as f:
        json.dump({
            'generated_at': time.strftime('%Y-%m-%d %H:%M:%S'),
            'total_scanned': total_scanned,
            'fossil_count': len(fossil_committees),
            'committees': fossil_committees
        }, f, indent=2)
    
    print()
    print(f"Done! Scanned {total_scanned} committees.")
    print(f"Found {len(fossil_committees)} fossil fuel PACs.")
    print(f"Saved to: {cache_path}")
    
    # Print top examples
    print()
    print("Sample fossil fuel PACs found:")
    for i, (cid, info) in enumerate(list(fossil_committees.items())[:10]):
        print(f"  - {info['name']} ({info['subsector']})")

def main():
    import argparse
    parser = argparse.ArgumentParser(description='Build FEC fossil fuel committee cache')
    parser.add_argument('--refresh', action='store_true', help='Rebuild cache even if exists')
    args = parser.parse_args()
    
    cache_path = DATA_DIR / 'fec_fossil_committees.json'
    
    if cache_path.exists() and not args.refresh:
        print(f"Cache already exists at {cache_path}")
        print("Use --refresh to rebuild")
        
        with open(cache_path) as f:
            data = json.load(f)
        print(f"Contains {data.get('fossil_count', 0)} fossil fuel PACs")
        print(f"Generated: {data.get('generated_at', 'unknown')}")
        return
    
    build_fossil_committee_cache()

if __name__ == '__main__':
    main()
