"""
Aggregate donation and LCV score data into politician_summaries table
"""
import os
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


def calculate_homepage_stats(supabase):
    """Calculate aggregated homepage stats from politician_summaries"""
    print("Calculating homepage stats...")
    
    # Get all summaries with LCV scores
    summaries = supabase.table("politician_summaries").select("politician_id, total_fossil_fuel_donations, latest_lcv_score").execute()
    
    if not summaries.data:
        print("No politician summaries found, skipping homepage stats")
        return
    
    total_fossil_fuel = sum(s["total_fossil_fuel_donations"] or 0 for s in summaries.data)
    members_with_money = [s for s in summaries.data if (s["total_fossil_fuel_donations"] or 0) > 0]
    members_with_zero = [s for s in summaries.data if (s["total_fossil_fuel_donations"] or 0) == 0]
    
    total_members = len(summaries.data)
    members_with_fossil_money = len(members_with_money)
    members_with_fossil_money_pct = round((members_with_fossil_money / total_members) * 100, 1) if total_members > 0 else 0
    
    # Top 50 recipients by donation amount
    sorted_by_donations = sorted(summaries.data, key=lambda x: x["total_fossil_fuel_donations"] or 0, reverse=True)
    top_50 = sorted_by_donations[:50]
    top_50_with_lcv = [s for s in top_50 if s["latest_lcv_score"] is not None]
    avg_lcv_top_50 = round(sum(s["latest_lcv_score"] for s in top_50_with_lcv) / len(top_50_with_lcv)) if top_50_with_lcv else 0
    
    # Members with zero fossil fuel money
    zero_with_lcv = [s for s in members_with_zero if s["latest_lcv_score"] is not None]
    avg_lcv_zero_members = round(sum(s["latest_lcv_score"] for s in zero_with_lcv) / len(zero_with_lcv)) if zero_with_lcv else 0
    
    homepage_stats = {
        "id": 1,
        "total_fossil_fuel_donations": total_fossil_fuel,
        "members_with_fossil_money": members_with_fossil_money,
        "members_with_fossil_money_pct": members_with_fossil_money_pct,
        "avg_lcv_top_50": avg_lcv_top_50,
        "members_with_zero": len(members_with_zero),
        "avg_lcv_zero_members": avg_lcv_zero_members,
        "last_updated": datetime.utcnow().isoformat()
    }
    
    # Upsert homepage stats (single row with id=1)
    existing = supabase.table("homepage_stats").select("id").eq("id", 1).execute()
    
    if existing.data:
        supabase.table("homepage_stats").update(homepage_stats).eq("id", 1).execute()
    else:
        supabase.table("homepage_stats").insert(homepage_stats).execute()
    
    print(f"Homepage stats updated: ${total_fossil_fuel:,.0f} total, {members_with_fossil_money} members with fossil money")

def main():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables required")
        return
    
    supabase = get_supabase_client()
    calculate_summaries(supabase)
    calculate_homepage_stats(supabase)

if __name__ == "__main__":
    main()
