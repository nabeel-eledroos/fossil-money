"""
Main ETL orchestrator - runs nightly
"""
import os
import sys

# Add scripts directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fetch_whoboughtmyrep import main as fetch_donations
from fetch_lcv_scores import main as fetch_lcv
from fetch_nffm_pledges import main as fetch_pledges
from aggregate_summaries import main as aggregate

def main():
    print("=== Fossil Money ETL - Nightly Run ===")
    print()
    
    print("Step 1: Fetching donation data...")
    try:
        fetch_donations()
    except Exception as e:
        print(f"Error in donation fetch: {e}")
    print()
    
    print("Step 2: Updating LCV scores...")
    try:
        fetch_lcv()
    except Exception as e:
        print(f"Error in LCV fetch: {e}")
    print()
    
    print("Step 3: Updating NFFM pledge status...")
    try:
        fetch_pledges()
    except Exception as e:
        print(f"Error in pledge update: {e}")
    print()
    
    print("Step 4: Aggregating summaries...")
    try:
        aggregate()
    except Exception as e:
        print(f"Error in aggregation: {e}")
    print()
    
    print("=== ETL Complete ===")

if __name__ == "__main__":
    main()
