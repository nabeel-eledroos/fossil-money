"""
Fetch and parse LCV (League of Conservation Voters) scores
Note: LCV scores need to be downloaded manually or scraped from their website
This script provides a framework for parsing CSV data
"""
import os
import csv
from io import StringIO
from supabase import create_client
from dotenv import load_dotenv
from pathlib import Path

# Load .env from etl/ dir or project root
env_paths = [
    Path(__file__).parent.parent / '.env',
    Path(__file__).parent.parent.parent / '.env',
    Path(__file__).parent.parent.parent / '.env.local',
]
for env_path in env_paths:
    if env_path.exists():
        load_dotenv(env_path)
        break

SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

def get_supabase_client():
    return create_client(SUPABASE_URL, SUPABASE_KEY)

STATE_ABBREVS = {
    "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR", "California": "CA",
    "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE", "Florida": "FL", "Georgia": "GA",
    "Hawaii": "HI", "Idaho": "ID", "Illinois": "IL", "Indiana": "IN", "Iowa": "IA",
    "Kansas": "KS", "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
    "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS", "Missouri": "MO",
    "Montana": "MT", "Nebraska": "NE", "Nevada": "NV", "New Hampshire": "NH", "New Jersey": "NJ",
    "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH",
    "Oklahoma": "OK", "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
    "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT", "Vermont": "VT",
    "Virginia": "VA", "Washington": "WA", "West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY",
    "District of Columbia": "DC", "Puerto Rico": "PR"
}

def parse_lcv_csv(csv_path):
    """
    Parse LCV scores from the LCV Scorecard CSV format.
    Format has state names as row headers, with Senate/House sections.
    """
    records = []
    current_state = None
    current_chamber = None
    
    with open(csv_path, 'r') as f:
        reader = csv.reader(f)
        for row in reader:
            if not row or not row[0]:
                continue
            
            first_cell = row[0].strip()
            
            # Check if it's a chamber header
            if first_cell in ("Senate", "House"):
                current_chamber = first_cell.lower()
                continue
            
            # Check if it's a state name
            if first_cell in STATE_ABBREVS:
                current_state = STATE_ABBREVS[first_cell]
                continue
            
            # Skip header row
            if first_cell == "First Name":
                continue
            
            # Parse data row
            if current_state and current_chamber and len(row) >= 5:
                first_name = row[0].strip()
                last_name = row[1].strip()
                year_score = row[4].strip()
                
                # Skip if no valid score
                if year_score in ("", "na", "N/A"):
                    continue
                
                try:
                    score = int(year_score)
                except ValueError:
                    continue
                
                records.append({
                    "name": f"{first_name} {last_name}",
                    "state": current_state,
                    "chamber": current_chamber,
                    "score": score,
                    "year": 2024  # Current year scores
                })
    
    return records

def normalize_name(name):
    """Normalize name for matching - remove middle initials, suffixes, etc."""
    import re
    name = name.lower().strip()
    # Remove common suffixes
    name = re.sub(r',?\s*(jr\.?|sr\.?|iii?|iv)$', '', name, flags=re.IGNORECASE)
    # Remove middle initials (single letters followed by period or space)
    name = re.sub(r'\s+[a-z]\.?\s+', ' ', name)
    # Remove periods
    name = name.replace('.', '')
    # Normalize whitespace
    name = re.sub(r'\s+', ' ', name).strip()
    return name

def match_politician(supabase, name, state, chamber):
    """Find politician in database by name, state, and chamber"""
    result = supabase.table("politicians").select("id, name").eq("state", state).eq("chamber", chamber).execute()
    
    lcv_normalized = normalize_name(name)
    lcv_parts = set(lcv_normalized.split())
    
    # Also handle Bernie -> Bernard type variations
    name_aliases = {
        'bernie': 'bernard',
        'dick': 'richard',
        'bob': 'robert',
        'mike': 'michael',
        'bill': 'william',
        'jim': 'james',
        'joe': 'joseph',
        'tom': 'thomas',
        'ted': 'edward',
        'dan': 'daniel',
        'chris': 'christopher',
        'chuck': 'charles',
        'ed': 'edward',
        'tim': 'timothy',
        'tony': 'anthony',
        'pete': 'peter',
        'jerry': 'gerald',
        'margie': 'marjorie',
        'maggie': 'margaret',
    }
    
    for pol in result.data or []:
        db_normalized = normalize_name(pol["name"])
        db_parts = set(db_normalized.split())
        
        # Direct match
        if lcv_normalized == db_normalized:
            return pol["id"]
        
        # Check if last names match and first name is similar
        lcv_first = lcv_normalized.split()[0] if lcv_normalized.split() else ''
        db_first = db_normalized.split()[0] if db_normalized.split() else ''
        lcv_last = lcv_normalized.split()[-1] if lcv_normalized.split() else ''
        db_last = db_normalized.split()[-1] if db_normalized.split() else ''
        
        if lcv_last == db_last:
            # Check first name match or alias
            if lcv_first == db_first:
                return pol["id"]
            if name_aliases.get(lcv_first) == db_first:
                return pol["id"]
            if name_aliases.get(db_first) == lcv_first:
                return pol["id"]
            # Check if one contains the other (handles partial names)
            if lcv_first in db_first or db_first in lcv_first:
                return pol["id"]
    
    return None

def upsert_lcv_scores(supabase, records):
    """Upsert LCV scores to database"""
    print(f"Processing {len(records)} LCV score records...")
    
    success_count = 0
    for record in records:
        politician_id = match_politician(
            supabase, 
            record["name"], 
            record["state"], 
            record["chamber"]
        )
        
        if not politician_id:
            print(f"  Could not find politician: {record['name']} ({record['state']})")
            continue
        
        score_data = {
            "politician_id": politician_id,
            "score": record["score"],
            "year": record["year"]
        }
        
        # Check if score exists for this politician and year
        existing = supabase.table("lcv_scores").select("id").eq("politician_id", politician_id).eq("year", record["year"]).execute()
        
        if existing.data:
            supabase.table("lcv_scores").update(score_data).eq("id", existing.data[0]["id"]).execute()
        else:
            supabase.table("lcv_scores").insert(score_data).execute()
        
        success_count += 1
    
    print(f"Successfully processed {success_count}/{len(records)} LCV scores")

def main():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables required")
        return
    
    csv_path = os.environ.get("LCV_CSV_PATH")
    if not csv_path:
        print("Error: LCV_CSV_PATH environment variable must point to valid CSV file")
        print("Download LCV scores from https://scorecard.lcv.org/")
        return
    
    # Resolve relative paths from project root
    if not os.path.isabs(csv_path):
        project_root = Path(__file__).parent.parent.parent
        csv_path = project_root / csv_path
    
    if not os.path.exists(csv_path):
        print(f"Error: CSV file not found at {csv_path}")
        return
    
    supabase = get_supabase_client()
    records = parse_lcv_csv(csv_path)
    upsert_lcv_scores(supabase, records)

if __name__ == "__main__":
    main()
