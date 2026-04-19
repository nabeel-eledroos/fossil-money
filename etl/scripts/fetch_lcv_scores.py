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

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

def get_supabase_client():
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def parse_lcv_csv(csv_path):
    """
    Parse LCV scores from CSV file
    Expected format: Name, State, Party, Chamber, Score, Year
    """
    records = []
    
    with open(csv_path, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            records.append({
                "name": row.get("Name", "").strip(),
                "state": row.get("State", "").strip(),
                "chamber": row.get("Chamber", "").strip().lower(),
                "score": int(row.get("Score", 0)),
                "year": int(row.get("Year", 2024))
            })
    
    return records

def match_politician(supabase, name, state, chamber):
    """Find politician in database by name, state, and chamber"""
    result = supabase.table("politicians").select("id, name").eq("state", state).eq("chamber", chamber).execute()
    
    for pol in result.data or []:
        # Simple name matching - could be improved with fuzzy matching
        if name.lower() in pol["name"].lower() or pol["name"].lower() in name.lower():
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
    if not csv_path or not os.path.exists(csv_path):
        print("Error: LCV_CSV_PATH environment variable must point to valid CSV file")
        print("Download LCV scores from https://scorecard.lcv.org/")
        return
    
    supabase = get_supabase_client()
    records = parse_lcv_csv(csv_path)
    upsert_lcv_scores(supabase, records)

if __name__ == "__main__":
    main()
