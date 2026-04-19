"""
Fetch donation data from WhoBoughtMyRep API
"""
import os
import json
import requests
from datetime import datetime
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
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

def fetch_donations_for_politician(bioguide_id, api_key):
    """Fetch donations for a politician from WhoBoughtMyRep"""
    # Note: This is a placeholder URL structure - actual API may differ
    # Check WhoBoughtMyRep documentation for correct endpoint
    url = f"https://api.whoboughtmyrep.com/v1/contributions"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json"
    }
    
    params = {
        "bioguide_id": bioguide_id,
        "limit": 1000
    }
    
    try:
        response = requests.get(url, headers=headers, params=params, timeout=30)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"  Error fetching donations for {bioguide_id}: {e}")
        return None

def transform_donation(donation, politician_id, sectors_config):
    """Transform API donation to our schema"""
    sector_tag = donation.get("sector_code") or donation.get("industry_code")
    donor_name = donation.get("contributor_name") or donation.get("donor_name")
    
    return {
        "politician_id": politician_id,
        "amount": float(donation.get("amount", 0)),
        "donor_name": donor_name,
        "donor_type": donation.get("contributor_type", "unknown"),
        "sector_tag": sector_tag,
        "is_fossil_fuel": is_fossil_fuel_donation(sector_tag, donor_name, sectors_config),
        "cycle_year": int(donation.get("cycle", datetime.now().year)),
        "source": "whoboughtmyrep",
        "source_transaction_id": donation.get("transaction_id") or donation.get("id")
    }

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
    
    print(f"Fetching donations for {len(politicians.data)} politicians...")
    
    for pol in politicians.data:
        print(f"  Processing {pol['name']}...")
        
        api_donations = fetch_donations_for_politician(pol["bioguide_id"], WHOBOUGHTMYREP_API_KEY)
        
        if not api_donations:
            continue
        
        donations = [
            transform_donation(d, pol["id"], sectors_config)
            for d in api_donations.get("contributions", [])
        ]
        
        if donations:
            upsert_donations(supabase, donations)
            print(f"    Upserted {len(donations)} donations")
    
    print("Donation fetch complete")

if __name__ == "__main__":
    main()
