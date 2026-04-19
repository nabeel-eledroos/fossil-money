"""
Fetch current congress members from unitedstates/congress-legislators repo
"""
import os
import requests
import yaml
from datetime import datetime
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

LEGISLATORS_URL = "https://raw.githubusercontent.com/unitedstates/congress-legislators/main/legislators-current.yaml"

def get_supabase_client():
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def fetch_legislators():
    """Fetch current legislators from GitHub"""
    print("Fetching legislators from GitHub...")
    response = requests.get(LEGISLATORS_URL)
    response.raise_for_status()
    return yaml.safe_load(response.text)

def get_current_term(legislator):
    """Get the most recent term for a legislator"""
    terms = legislator.get("terms", [])
    if not terms:
        return None
    return terms[-1]

def transform_legislator(legislator):
    """Transform legislator data to our schema"""
    term = get_current_term(legislator)
    if not term:
        return None
    
    bio = legislator.get("bio", {})
    ids = legislator.get("id", {})
    
    name_data = legislator.get("name", {})
    official_full = name_data.get("official_full")
    if not official_full:
        first = name_data.get("first", "")
        last = name_data.get("last", "")
        official_full = f"{first} {last}"
    
    chamber = "senate" if term.get("type") == "sen" else "house"
    party_map = {"Democrat": "D", "Republican": "R", "Independent": "I"}
    party = party_map.get(term.get("party"), term.get("party", "")[:1])
    
    photo_url = None
    bioguide_id = ids.get("bioguide")
    if bioguide_id:
        photo_url = f"https://bioguide.congress.gov/bioguide/photo/{bioguide_id[0]}/{bioguide_id}.jpg"
    
    return {
        "bioguide_id": bioguide_id,
        "fec_candidate_id": ids.get("fec", [None])[0] if isinstance(ids.get("fec"), list) else ids.get("fec"),
        "name": official_full,
        "party": party,
        "chamber": chamber,
        "state": term.get("state"),
        "district": str(term.get("district")) if term.get("district") is not None else None,
        "photo_url": photo_url,
        "office_phone": term.get("phone"),
        "website_url": term.get("url"),
        "signed_nffm_pledge": False,
        "updated_at": datetime.utcnow().isoformat()
    }

def upsert_legislators(supabase, legislators):
    """Upsert legislators to database"""
    print(f"Upserting {len(legislators)} legislators...")
    
    for leg in legislators:
        transformed = transform_legislator(leg)
        if not transformed or not transformed["bioguide_id"]:
            continue
        
        existing = supabase.table("politicians").select("id").eq("bioguide_id", transformed["bioguide_id"]).execute()
        
        if existing.data:
            supabase.table("politicians").update(transformed).eq("bioguide_id", transformed["bioguide_id"]).execute()
        else:
            supabase.table("politicians").insert(transformed).execute()
    
    print("Legislators upserted successfully")

def main():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables required")
        return
    
    supabase = get_supabase_client()
    legislators = fetch_legislators()
    upsert_legislators(supabase, legislators)

if __name__ == "__main__":
    main()
