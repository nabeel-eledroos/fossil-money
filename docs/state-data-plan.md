# State Officials Data Plan

## Current Status
- Federal officials: **Live** (FEC data)
- State officials: **Pending** (no data source yet)
- Local officials: **Pending**

## Why FEC Doesn't Cover State Officials
The Federal Election Commission only tracks campaign finance for federal races (President, U.S. Senate, U.S. House). State-level campaign finance is regulated and tracked by each state individually.

## Recommended Data Source: FollowTheMoney.org

**National Institute on Money in Politics** (FollowTheMoney.org) aggregates state campaign finance data from all 50 states.

### What they provide:
- Governor, state legislature, and other statewide office campaign contributions
- Donor information including employer/industry
- Historical data going back to 1989 for some states
- Bulk data downloads and API access

### Access options:
1. **Bulk Data** - Available for researchers/nonprofits (may require application)
2. **API** - Available at https://api.followthemoney.org/
3. **Data request** - Can request custom datasets

### Integration steps:
1. Apply for API/bulk data access at FollowTheMoney.org
2. Create `fetch_state_officials.py` ETL script to pull state legislators (could use Open States API for official info)
3. Create `fetch_state_contributions.py` to pull campaign finance from FollowTheMoney
4. Map their industry codes to our fossil fuel classification
5. Backfill `politicians` table with `level = 'state'`
6. Update coverage table to `live` for state

### Alternative/supplemental sources:
- **Open States API** (https://openstates.org/) - For legislator info (name, district, party) but NOT campaign finance
- **Individual state databases** - More granular but requires 50 different integrations
- **OpenSecrets** - Has some state data but less comprehensive than FollowTheMoney

## LCV Scores for State Officials
LCV provides state-level scorecards for some state legislators. Would need to scrape or request this data separately from federal LCV scores.

## Estimated Effort
- API access approval: 1-2 weeks
- ETL development: 1-2 weeks  
- Testing/validation: 1 week
- Total: ~1 month

## Next Steps
1. [ ] Apply for FollowTheMoney.org API access
2. [ ] Review their data schema and industry classification
3. [ ] Prototype state legislator fetch script
4. [ ] Map fossil fuel industries to their codes
5. [ ] Implement full ETL pipeline
6. [ ] Set state coverage to `live`
