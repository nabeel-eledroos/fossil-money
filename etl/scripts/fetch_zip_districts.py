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

# ZIP-to-CD from OpenSourceActivismTech (updated for 119th Congress)
ZIP_CD_URL = "https://raw.githubusercontent.com/OpenSourceActivismTech/us-zipcodes-congress/master/zccd.csv"

def get_supabase_client():
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def fetch_zip_to_cd():
    """Fetch ZIP to Congressional District mapping from Census"""
    print("Fetching ZIP-CD crosswalk from Census Bureau...")
    response = requests.get(ZIP_CD_URL)
    response.raise_for_status()
    return response.text

def parse_zip_cd_data(data):
    """Parse ZIP-CD CSV from OpenSourceActivismTech"""
    records = []
    reader = csv.DictReader(StringIO(data))
    
    for row in reader:
        zip_code = row.get("zcta", "").strip()
        state_abbr = row.get("state_abbr", "").strip()
        cd = row.get("cd", "").strip()
        
        if not zip_code or not state_abbr or not cd:
            continue
        
        # Pad ZIP to 5 digits
        zip_code = zip_code.zfill(5)
        if len(zip_code) != 5:
            continue
        
        # Format congressional district (e.g., "CA-12")
        # cd "0" means at-large district
        district_num = cd.zfill(2)
        congressional_district = f"{state_abbr}-{district_num}"
        
        records.append({
            "zip_code": zip_code,
            "state": state_abbr,
            "congressional_district": congressional_district
        })
    
    return records

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
