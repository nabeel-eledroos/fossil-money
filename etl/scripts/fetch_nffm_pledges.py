"""
Fetch No Fossil Fuel Money pledge status
Note: This data needs to be maintained manually or scraped from NFFM Coalition website
"""
import os
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

# Known pledge signers (bioguide_ids) - update this list periodically
# Source: https://nofossilfuelmoney.org/
# These are some known federal signers as of 2024
PLEDGE_SIGNERS = [
    # Senators
    "M000133",  # Ed Markey
    "W000817",  # Elizabeth Warren  
    "S000033",  # Bernie Sanders
    "M001176",  # Jeff Merkley
    "B001288",  # Cory Booker
    "W000779",  # Ron Wyden
    "H001042",  # Mazie Hirono
    "B001277",  # Richard Blumenthal
    "P000145",  # Alex Padilla
    # House
    "O000172",  # Alexandria Ocasio-Cortez
    "T000481",  # Rashida Tlaib
    "O000173",  # Ilhan Omar
    "P000617",  # Ayanna Pressley
    "G000586",  # Jesús García
    "J000298",  # Pramila Jayapal
    "L000551",  # Barbara Lee
    "K000389",  # Ro Khanna
    "P000607",  # Mark Pocan
    "G000553",  # Al Green
    "C001080",  # Judy Chu
    "B001300",  # Nanette Barragán
    "E000297",  # Adriano Espaillat
    "V000081",  # Nydia Velázquez
    "N000147",  # Eleanor Holmes Norton
    "M001160",  # Gwen Moore
    "C001067",  # Yvette Clarke
    "J000288",  # Hank Johnson (if found)
    "L000287",  # John Lewis (historical)
    "D000096",  # Danny Davis
    "S001145",  # Jan Schakowsky
    "B000574",  # Earl Blumenauer
    "D000191",  # Peter DeFazio (historical)
    "H001068",  # Jared Huffman
    "L000579",  # Alan Lowenthal (historical)
    "M001137",  # Gregory Meeks
    "N000179",  # Grace Napolitano
    "S001200",  # Darren Soto
    "C001097",  # Tony Cárdenas
    "T000472",  # Mark Takano
]

def get_supabase_client():
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def update_pledge_status(supabase):
    """Update pledge status for all politicians"""
    print("Updating NFFM pledge status...")
    
    # Reset all to no pledge first
    supabase.table("politicians").update({
        "signed_nffm_pledge": False,
        "pledge_status": "none"
    }).neq("id", "00000000-0000-0000-0000-000000000000").execute()
    
    # Set true for known signers
    updated = 0
    if PLEDGE_SIGNERS:
        for bioguide_id in PLEDGE_SIGNERS:
            result = supabase.table("politicians").update({
                "signed_nffm_pledge": True,
                "pledge_status": "signed"
            }).eq("bioguide_id", bioguide_id).execute()
            if result.data:
                updated += 1
    
    print(f"Updated pledge status for {updated} signers (of {len(PLEDGE_SIGNERS)} in list)")

def main():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables required")
        return
    
    supabase = get_supabase_client()
    update_pledge_status(supabase)

if __name__ == "__main__":
    main()
