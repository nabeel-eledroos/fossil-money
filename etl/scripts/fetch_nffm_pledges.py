"""
Fetch No Fossil Fuel Money pledge status
Note: This data needs to be maintained manually or scraped from NFFM Coalition website
"""
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

# Known pledge signers (bioguide_ids) - update this list periodically
# Source: https://nofossilfuelmoney.org/
PLEDGE_SIGNERS = [
    # Add bioguide IDs of known pledge signers here
    # Example: "A000360", "B001288", etc.
]

def get_supabase_client():
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def update_pledge_status(supabase):
    """Update pledge status for all politicians"""
    print("Updating NFFM pledge status...")
    
    # Reset all to false first
    supabase.table("politicians").update({"signed_nffm_pledge": False}).neq("id", "00000000-0000-0000-0000-000000000000").execute()
    
    # Set true for known signers
    if PLEDGE_SIGNERS:
        for bioguide_id in PLEDGE_SIGNERS:
            supabase.table("politicians").update({"signed_nffm_pledge": True}).eq("bioguide_id", bioguide_id).execute()
    
    print(f"Updated pledge status for {len(PLEDGE_SIGNERS)} signers")

def main():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables required")
        return
    
    supabase = get_supabase_client()
    update_pledge_status(supabase)

if __name__ == "__main__":
    main()
