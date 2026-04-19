"""
Refresh congress members - run on-demand for special elections
"""
from fetch_congress_members import main as fetch_members
from fetch_zip_districts import main as fetch_districts
from aggregate_summaries import main as aggregate

def main():
    print("=== Refreshing Congress Members ===")
    print()
    
    print("Step 1: Fetching latest congress members...")
    fetch_members()
    print()
    
    print("Step 2: Refreshing ZIP-district mappings...")
    fetch_districts()
    print()
    
    print("Step 3: Re-aggregating summaries...")
    aggregate()
    print()
    
    print("=== Refresh Complete ===")

if __name__ == "__main__":
    main()
