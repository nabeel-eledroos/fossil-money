"""
Fetch donation data from WhoBoughtMyRep API
"""
import os
import json
import requests
from datetime import datetime
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
WHOBOUGHTMYREP_API_KEY = os.environ.get("WHOBOUGHTMYREP_API_KEY")

# Load fossil fuel sector tags
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SECTORS_FILE = os.path.join(SCRIPT_DIR, "..", "config", "fossil_fuel_sectors.json")

def get_supabase_client():
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def load_fossil_fuel_sectors():
    """Load fossil fuel sector mappings"""
    with open(SECTORS_FILE, 'r') as f:
        return json.load(f)

def is_fossil_fuel_donation(sector_tag, donor_name, sectors_config):
    """Determine if a donation is from fossil fuel industry"""
    sector_tag = sector_tag or ""
    donor_name = donor_name or ""
    
    # Check direct sector mappings
    if sector_tag in sectors_config.get("fossil_fuel_sectors", []):
        return True
    
    # Check sector code mappings
    if sector_tag in sectors_config.get("sector_mappings", {}):
        return True
    
    # Check keywords in donor name
    donor_lower = donor_name.lower()
    for keyword in sectors_config.get("keywords", []):
        if keyword.lower() in donor_lower:
            return True
    
    return False

def fetch_politician_data(bioguide_id, api_key):
    """Fetch politician profile with industry data from WhoBoughtMyRep"""
    url = f"https://whoboughtmyrep.com/api/v1/reps/{bioguide_id}"
    
    headers = {
        "x-api-key": api_key,
        "Accept": "application/json"
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"  Error fetching data for {bioguide_id}: {e}")
        return None

FOSSIL_FUEL_INDUSTRIES = [
    "oil & gas",
    "mining",
    "coal mining", 
    "electric utilities",
    "energy & natural resources",
    "misc energy"
]

def extract_fossil_fuel_from_industries(industries, politician_id, sectors_config):
    """Extract fossil fuel donations from top industries data"""
    donations = []
    
    for industry in industries:
        industry_name = industry.get("industry", "").lower()
        amount = float(industry.get("total_attributed", 0))
        
        if amount <= 0:
            continue
        
        is_fossil = any(ff in industry_name for ff in FOSSIL_FUEL_INDUSTRIES)
        
        donations.append({
            "politician_id": politician_id,
            "amount": amount,
            "donor_name": industry.get("industry", "Unknown Industry"),
            "donor_type": "industry_aggregate",
            "sector_tag": industry.get("industry"),
            "is_fossil_fuel": is_fossil,
            "cycle_year": 2024,  # Current cycle
            "source": "whoboughtmyrep",
            "source_transaction_id": f"{politician_id}_{industry.get('industry', 'unknown')}_{2024}"
        })
    
    return donations

def upsert_donations(supabase, donations):
    """Upsert donations to database"""
    for donation in donations:
        if not donation.get("source_transaction_id"):
            continue
        
        # Check if donation exists
        existing = supabase.table("donations").select("id").eq("source", donation["source"]).eq("source_transaction_id", donation["source_transaction_id"]).execute()
        
        if existing.data:
            supabase.table("donations").update(donation).eq("id", existing.data[0]["id"]).execute()
        else:
            supabase.table("donations").insert(donation).execute()

def main():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables required")
        return
    
    if not WHOBOUGHTMYREP_API_KEY:
        print("Error: WHOBOUGHTMYREP_API_KEY environment variable required")
        print("Sign up at https://whoboughtmyrep.com for API access")
        return
    
    supabase = get_supabase_client()
    sectors_config = load_fossil_fuel_sectors()
    
    # Get all politicians with bioguide IDs
    politicians = supabase.table("politicians").select("id, bioguide_id, name").not_.is_("bioguide_id", "null").execute()
    
    print(f"Fetching industry data for {len(politicians.data)} politicians...")
    
    success_count = 0
    for pol in politicians.data:
        print(f"  Processing {pol['name']}...")
        
        api_response = fetch_politician_data(pol["bioguide_id"], WHOBOUGHTMYREP_API_KEY)
        
        if not api_response or not api_response.get("success"):
            continue
        
        data = api_response.get("data", {})
        industries = data.get("top_industries", [])
        
        if not industries:
            continue
        
        donations = extract_fossil_fuel_from_industries(industries, pol["id"], sectors_config)
        
        if donations:
            upsert_donations(supabase, donations)
            fossil_count = sum(1 for d in donations if d["is_fossil_fuel"])
            print(f"    Upserted {len(donations)} industry records ({fossil_count} fossil fuel)")
            success_count += 1
    
    print(f"Industry data fetch complete. Processed {success_count} politicians.")

if __name__ == "__main__":
    main()
