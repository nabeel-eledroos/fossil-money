"""
Aggregate donation and LCV score data into politician_summaries table
"""
import os
from datetime import datetime
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

def get_supabase_client():
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def calculate_summaries(supabase):
    """Calculate aggregated summaries for all politicians"""
    print("Calculating politician summaries...")
    
    # Get all politicians
    politicians = supabase.table("politicians").select("id").execute()
    
    for pol in politicians.data:
        politician_id = pol["id"]
        
        # Get fossil fuel donation total
        ff_result = supabase.table("donations").select("amount").eq("politician_id", politician_id).eq("is_fossil_fuel", True).execute()
        
        total_fossil_fuel = sum(d["amount"] for d in ff_result.data) if ff_result.data else 0
        
        # Get clean energy donation total (sector tags starting with "clean" or "renewable")
        # For MVP, we'll set this to 0 - would need proper sector tagging
        total_clean_energy = 0
        
        # Get LCV scores
        lcv_result = supabase.table("lcv_scores").select("score, year").eq("politician_id", politician_id).order("year", desc=True).execute()
        
        lcv_score_trend = {}
        latest_lcv_score = None
        
        for score in lcv_result.data or []:
            year_str = str(score["year"])
            lcv_score_trend[year_str] = score["score"]
            if latest_lcv_score is None:
                latest_lcv_score = score["score"]
        
        # Upsert summary
        summary = {
            "politician_id": politician_id,
            "total_fossil_fuel_donations": total_fossil_fuel,
            "total_clean_energy_donations": total_clean_energy,
            "latest_lcv_score": latest_lcv_score,
            "lcv_score_trend": lcv_score_trend,
            "last_updated": datetime.utcnow().isoformat()
        }
        
        existing = supabase.table("politician_summaries").select("politician_id").eq("politician_id", politician_id).execute()
        
        if existing.data:
            supabase.table("politician_summaries").update(summary).eq("politician_id", politician_id).execute()
        else:
            supabase.table("politician_summaries").insert(summary).execute()
    
    print(f"Calculated summaries for {len(politicians.data)} politicians")

def main():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables required")
        return
    
    supabase = get_supabase_client()
    calculate_summaries(supabase)

if __name__ == "__main__":
    main()
