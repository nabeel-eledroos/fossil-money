"""
Aggregate donation and LCV score data into politician_summaries table
Updated for v2 schema with fossil_pct, outside_fossil, subsector_breakdown, etc.
"""
import os
import json
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

# Load config
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(SCRIPT_DIR, "..", "config", "aggregate_config.json")

def load_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r') as f:
            return json.load(f)
    return {
        "scope_label": "U.S. Congress · 2023–2024 cycle",
        "scope_levels": ["federal"],
        "cycle_window": {"from": 2023, "to": 2024}
    }

def get_supabase_client():
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def calculate_summaries(supabase, config):
    """Calculate aggregated summaries for all politicians"""
    print("Calculating politician summaries...")
    
    # Get all politicians
    politicians = supabase.table("politicians").select("id, total_raised, signed_nffm_pledge, pledge_status").execute()
    
    processed = 0
    for pol in politicians.data:
        politician_id = pol["id"]
        
        # Get all donations for this politician
        donations = supabase.table("donations").select("amount, is_fossil_fuel, is_clean_energy, donor_type, industry_subsector").eq("politician_id", politician_id).execute()
        
        fossil_donations = [d for d in (donations.data or []) if d.get("is_fossil_fuel")]
        clean_donations = [d for d in (donations.data or []) if d.get("is_clean_energy")]
        
        total_fossil_fuel = sum(d["amount"] for d in fossil_donations) if fossil_donations else 0
        total_clean_energy = sum(d["amount"] for d in clean_donations) if clean_donations else 0
        
        # Total raised from politician record or sum of all donations
        total_raised = pol.get("total_raised") or sum(d["amount"] for d in (donations.data or [])) or 0
        
        # Calculate fossil percentage
        fossil_pct = round((total_fossil_fuel / total_raised * 100), 1) if total_raised > 0 else 0
        
        # Subsector breakdown
        subsector_breakdown = {"oil_gas": 0, "coal": 0, "utilities": 0, "mining": 0}
        for d in fossil_donations:
            subsector = d.get("industry_subsector", "oil_gas")
            if subsector in subsector_breakdown:
                subsector_breakdown[subsector] += d["amount"]
            else:
                subsector_breakdown["oil_gas"] += d["amount"]  # Default to oil_gas
        
        # PAC vs Individual split
        pac_total = sum(d["amount"] for d in fossil_donations if d.get("donor_type") == "PAC")
        individual_total = sum(d["amount"] for d in fossil_donations if d.get("donor_type") != "PAC")
        pac_vs_individual = {"pac": pac_total, "individual": individual_total}
        
        # Top donors (aggregate by donor name)
        donor_totals = {}
        for d in fossil_donations:
            name = d.get("donor_name") or "Unknown"
            if name not in donor_totals:
                donor_totals[name] = {"amt": 0, "sector": d.get("industry_subsector", "oil_gas"), "type": d.get("donor_type", "Individual")}
            donor_totals[name]["amt"] += d["amount"]
        
        top_donors = sorted(
            [{"n": name, "amt": data["amt"], "sector": data["sector"], "type": data["type"]} 
             for name, data in donor_totals.items()],
            key=lambda x: x["amt"],
            reverse=True
        )[:6]
        
        # Get outside spending (if table exists)
        try:
            outside = supabase.table("outside_spending").select("amount").eq("politician_id", politician_id).eq("is_fossil_fuel", True).execute()
            total_outside_fossil = sum(o["amount"] for o in (outside.data or []))
        except:
            total_outside_fossil = 0
        
        # Get LCV scores
        lcv_result = supabase.table("lcv_scores").select("score, year").eq("politician_id", politician_id).order("year", desc=True).execute()
        
        lcv_score_trend = {}
        latest_lcv_score = None
        
        for score in lcv_result.data or []:
            year_str = str(score["year"])
            lcv_score_trend[year_str] = score["score"]
            if latest_lcv_score is None:
                latest_lcv_score = score["score"]
        
        # Determine pledge status
        pledge_status = pol.get("pledge_status") or ("signed" if pol.get("signed_nffm_pledge") else "none")
        
        # Flagged logic: heavy fossil funding with weak record, or broke pledge
        flagged = (total_fossil_fuel > 100000 and (latest_lcv_score or 100) < 25) or pledge_status == "broke"
        
        # Upsert summary
        summary = {
            "politician_id": politician_id,
            "total_fossil_fuel_donations": total_fossil_fuel,
            "total_raised": total_raised,
            "fossil_pct": fossil_pct,
            "total_outside_fossil": total_outside_fossil,
            "total_clean_energy_donations": total_clean_energy,
            "subsector_breakdown": subsector_breakdown,
            "pac_vs_individual": pac_vs_individual,
            "top_donors": top_donors,
            "latest_lcv_score": latest_lcv_score,
            "lcv_score_trend": lcv_score_trend,
            "pledge_status": pledge_status,
            "flagged": flagged,
            "last_updated": datetime.utcnow().isoformat()
        }
        
        existing = supabase.table("politician_summaries").select("politician_id").eq("politician_id", politician_id).execute()
        
        if existing.data:
            supabase.table("politician_summaries").update(summary).eq("politician_id", politician_id).execute()
        else:
            supabase.table("politician_summaries").insert(summary).execute()
        
        processed += 1
        if processed % 100 == 0:
            print(f"  processed {processed}/{len(politicians.data)} politicians...", flush=True)
    
    print(f"Calculated summaries for {len(politicians.data)} politicians")


def calculate_homepage_stats(supabase, config):
    """Calculate aggregated homepage stats from politician_summaries"""
    print("Calculating homepage stats...")
    
    # Get all summaries with LCV scores
    summaries = supabase.table("politician_summaries").select(
        "politician_id, total_fossil_fuel_donations, total_raised, fossil_pct, "
        "total_outside_fossil, total_clean_energy_donations, latest_lcv_score, pledge_status"
    ).execute()
    
    if not summaries.data:
        print("No politician summaries found, skipping homepage stats")
        return
    
    total_fossil_fuel = sum(s["total_fossil_fuel_donations"] or 0 for s in summaries.data)
    total_raised_all = sum(s["total_raised"] or 0 for s in summaries.data)
    total_outside_fossil = sum(s["total_outside_fossil"] or 0 for s in summaries.data)
    total_clean_energy = sum(s["total_clean_energy_donations"] or 0 for s in summaries.data)
    
    members_with_money = [s for s in summaries.data if (s["total_fossil_fuel_donations"] or 0) > 0]
    members_with_zero = [s for s in summaries.data if (s["total_fossil_fuel_donations"] or 0) == 0]
    pledge_signers = [s for s in summaries.data if s.get("pledge_status") == "signed"]
    
    total_members = len(summaries.data)
    members_with_fossil_money = len(members_with_money)
    members_with_fossil_money_pct = round((members_with_fossil_money / total_members) * 100, 1) if total_members > 0 else 0
    
    # Fossil percentage of total
    fossil_pct_of_total = round((total_fossil_fuel / total_raised_all * 100), 1) if total_raised_all > 0 else 0
    
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
        "total_raised_all": total_raised_all,
        "fossil_pct_of_total": fossil_pct_of_total,
        "total_clean_energy_donations": total_clean_energy,
        "total_outside_fossil": total_outside_fossil,
        "pledge_signers": len(pledge_signers),
        "officials_tracked": total_members,
        "members_with_fossil_money": members_with_fossil_money,
        "members_with_fossil_money_pct": members_with_fossil_money_pct,
        "avg_lcv_top_50": avg_lcv_top_50,
        "members_with_zero": len(members_with_zero),
        "avg_lcv_zero_members": avg_lcv_zero_members,
        "scope": config.get("scope_label", "national"),
        "as_of_label": config.get("scope_label", "U.S. Congress · 2023–2024 cycle"),
        "last_updated": datetime.utcnow().isoformat()
    }
    
    # Upsert homepage stats (single row with id=1)
    existing = supabase.table("homepage_stats").select("id").eq("id", 1).execute()
    
    if existing.data:
        supabase.table("homepage_stats").update(homepage_stats).eq("id", 1).execute()
    else:
        supabase.table("homepage_stats").insert(homepage_stats).execute()
    
    print(f"Homepage stats updated:")
    print(f"  Total fossil fuel: ${total_fossil_fuel:,.0f}")
    print(f"  Fossil % of total: {fossil_pct_of_total}%")
    print(f"  Clean energy: ${total_clean_energy:,.0f}")
    print(f"  Pledge signers: {len(pledge_signers)}")
    print(f"  Officials tracked: {total_members}")
    print(f"  Members with fossil money: {members_with_fossil_money} ({members_with_fossil_money_pct}%)")

def main():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables required")
        return
    
    config = load_config()
    supabase = get_supabase_client()
    calculate_summaries(supabase, config)
    calculate_homepage_stats(supabase, config)
    print("Done!")

if __name__ == "__main__":
    main()
