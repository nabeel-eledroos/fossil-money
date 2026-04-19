"""
Fetch ZIP to Congressional District mapping from Census Bureau
"""
import os
import requests
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

# Census Bureau ZIP-to-CD relationship file (118th Congress)
# Note: This URL may need updating for new Congress sessions
ZIP_CD_URL = "https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520_cd118_rel.txt"

def get_supabase_client():
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def fetch_zip_to_cd():
    """Fetch ZIP to Congressional District mapping from Census"""
    print("Fetching ZIP-CD crosswalk from Census Bureau...")
    response = requests.get(ZIP_CD_URL)
    response.raise_for_status()
    return response.text

def parse_zip_cd_data(data):
    """Parse Census ZIP-CD relationship file"""
    records = []
    reader = csv.DictReader(StringIO(data), delimiter='|')
    
    for row in reader:
        zip_code = row.get("ZCTA5", "").strip()
        state = row.get("STATE", "").strip()
        cd = row.get("CD118", "").strip()
        
        if not zip_code or not state or not cd or len(zip_code) != 5:
            continue
        
        # Convert state FIPS to state abbreviation
        state_abbr = fips_to_state(state)
        if not state_abbr:
            continue
        
        # Format congressional district (e.g., "CA-12")
        district_num = cd.zfill(2)
        congressional_district = f"{state_abbr}-{district_num}"
        
        records.append({
            "zip_code": zip_code,
            "state": state_abbr,
            "congressional_district": congressional_district
        })
    
    return records

def fips_to_state(fips):
    """Convert FIPS code to state abbreviation"""
    fips_map = {
        "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA",
        "08": "CO", "09": "CT", "10": "DE", "11": "DC", "12": "FL",
        "13": "GA", "15": "HI", "16": "ID", "17": "IL", "18": "IN",
        "19": "IA", "20": "KS", "21": "KY", "22": "LA", "23": "ME",
        "24": "MD", "25": "MA", "26": "MI", "27": "MN", "28": "MS",
        "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH",
        "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND",
        "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI",
        "45": "SC", "46": "SD", "47": "TN", "48": "TX", "49": "UT",
        "50": "VT", "51": "VA", "53": "WA", "54": "WV", "55": "WI",
        "56": "WY", "60": "AS", "66": "GU", "69": "MP", "72": "PR",
        "78": "VI"
    }
    return fips_map.get(fips)

def upsert_zip_districts(supabase, records):
    """Upsert ZIP-district mappings to database"""
    print(f"Upserting {len(records)} ZIP-district records...")
    
    # Process in batches
    batch_size = 1000
    for i in range(0, len(records), batch_size):
        batch = records[i:i + batch_size]
        supabase.table("zip_to_district").upsert(batch, on_conflict="zip_code").execute()
        print(f"  Processed {min(i + batch_size, len(records))}/{len(records)}")
    
    print("ZIP-district mappings upserted successfully")

def main():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables required")
        return
    
    supabase = get_supabase_client()
    
    data = fetch_zip_to_cd()
    records = parse_zip_cd_data(data)
    
    # Deduplicate by ZIP (keep first occurrence)
    seen_zips = set()
    unique_records = []
    for record in records:
        if record["zip_code"] not in seen_zips:
            seen_zips.add(record["zip_code"])
            unique_records.append(record)
    
    upsert_zip_districts(supabase, unique_records)

if __name__ == "__main__":
    main()
