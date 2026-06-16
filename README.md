This is Fossil Money, a civic transparency web app that helps citizens track fossil fuel donations to their elected officials. [Check it out here!](https://fossil-money.vercel.app)

Purpose: Enter your ZIP code to find your 2 U.S. senators and House representative, see how much fossil fuel money they've accepted, their League of Conservation Voters (LCV) climate scores, and whether they've signed the "No Fossil Fuel Money" pledge. Users can then contact their reps with pre-written templates.

It's essentially a "follow the money" tool for climate accountability.

## Contributing

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Architecture Overview

Fossil Money is a Next.js application that shows users which politicians represent them and how much fossil fuel money those politicians have received. It combines data from multiple sources (FEC, LCV, NFFM) into a Supabase database, pre-computes summaries via ETL, and serves them through API routes to the frontend.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA SOURCES                                    │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────────────────┤
│ FEC API     │ Congress    │ LCV         │ NFFM        │ Census              │
│ (donations) │ Legislators │ (scores)    │ (pledges)   │ (ZIP→district)      │
└──────┬──────┴──────┬──────┴──────┬──────┴──────┬──────┴──────┬──────────────┘
       │             │             │             │             │
       ▼             ▼             ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ETL LAYER (Python)                                 │
│  etl/scripts/                                                                │
│  ├── fetch_fec_contributions.py  ─┐                                          │
│  ├── fetch_fec_committees.py     ─┼── Donations + Classification             │
│  ├── fetch_congress_members.py   ─┘                                          │
│  ├── fetch_lcv_scores.py         ─── LCV Scores                              │
│  ├── fetch_nffm_pledges.py       ─── Pledge Status                           │
│  ├── fetch_zip_districts.py      ─── Geographic Lookup                       │
│  └── aggregate_summaries.py      ─── Pre-compute per-politician stats        │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SUPABASE (PostgreSQL)                                │
│  Core Tables:                                                                │
│  ├── politicians          (officials: name, party, chamber, state, photo)    │
│  ├── donations            (contribution records, classified fossil/clean)    │
│  ├── lcv_scores           (environmental voting scores by year)              │
│  ├── politician_summaries (pre-computed aggregates for fast reads)           │
│  ├── homepage_stats       (national totals for landing page)                 │
│  ├── zip_to_district      (ZIP → congressional district mapping)             │
│  └── coverage             (which levels are live: federal/state/local)       │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         API LAYER (Next.js Routes)                           │
│  src/app/api/                                                                │
│  ├── reps/route.ts           GET /api/reps?zip=XXXXX                         │
│  ├── politician/[id]/route.ts GET /api/politician/:id                        │
│  ├── stats/national/route.ts  GET /api/stats/national                        │
│  └── og/[id]/route.tsx        GET /api/og/:id (OpenGraph images)             │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React/Next.js)                             │
│  src/app/                                                                    │
│  ├── page.tsx                 Landing page with ZIP search + national stats  │
│  ├── results/[zip]/page.tsx   Results page showing your representatives      │
│  └── politician/[id]/page.tsx Detailed profile for a single politician       │
└─────────────────────────────────────────────────────────────────────────────┘
```


See more detail [here](docs/architecture.md).