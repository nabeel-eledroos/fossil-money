"""
fetch_officials.py — the keystone ETL.

Builds the people-and-geography backbone every other script joins to:
  divisions, committees, committee_memberships, and politicians
across all three levels:
  • Federal  — unitedstates/congress-legislators (people + committees + membership)
  • State    — Open States API v3 (legislators + committees)
  • Local    — Cicero API (mayors / council / county)  [paid; best-effort]

Idempotent: every entity upserts on a natural key, so reruns are safe.
Matches the existing etl/scripts/ pattern (supabase client, .env loading).

Run:
    python etl/scripts/fetch_officials.py                 # all levels
    python etl/scripts/fetch_officials.py --federal       # one level
    python etl/scripts/fetch_officials.py --state TX CA    # specific states
"""
import os
import sys
import argparse
from datetime import datetime, date

import requests
import yaml
from supabase import create_client
from dotenv import load_dotenv
from pathlib import Path

# --- env (same pattern as the other scripts) -------------------------------
for env_path in [
    Path(__file__).parent.parent / ".env",
    Path(__file__).parent.parent.parent / ".env",
    Path(__file__).parent.parent.parent / ".env.local",
]:
    if env_path.exists():
        load_dotenv(env_path)
        break

SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")
OPENSTATES_API_KEY = os.environ.get("OPENSTATES_API_KEY")
CICERO_API_KEY = os.environ.get("CICERO_API_KEY")

LEGISLATORS_URL = "https://raw.githubusercontent.com/unitedstates/congress-legislators/main/legislators-current.yaml"
COMMITTEES_URL  = "https://raw.githubusercontent.com/unitedstates/congress-legislators/main/committees-current.yaml"
MEMBERSHIP_URL  = "https://raw.githubusercontent.com/unitedstates/congress-legislators/main/committee-membership-current.yaml"
OPENSTATES_BASE = "https://v3.openstates.org"
CICERO_BASE     = "https://app.cicerodata.com/v3.1"  # Cicero rebranded off azavea.com; confirm exact host at app.cicerodata.com/docs

# Committees whose members hold the most leverage over fossil-fuel policy.
ENERGY_COMMITTEE_THOMAS_IDS = {"SSEG", "SSEV", "HSIF", "HSII"}  # ENR, EPW, E&C, Nat. Resources
ENERGY_KEYWORDS = ("energy", "natural resources", "environment", "environmental")

# Upcoming November election year (even year >= today).
def election_cycle(today=None):
    today = today or date.today()
    y = today.year
    return y if (y % 2 == 0 and today.month <= 11) else y + (y % 2) + (2 if y % 2 == 0 else 1) - (1 if y % 2 else 0)

ELECTION_CYCLE = election_cycle()

PARTY = {"Democrat": "D", "Republican": "R", "Independent": "I", "Democratic": "D"}


# ---------------------------------------------------------------------------
def sb():
    if not (SUPABASE_URL and SUPABASE_KEY):
        sys.exit("Missing SUPABASE_URL / SUPABASE_SERVICE_KEY")
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def is_energy_committee(thomas_id, name):
    if thomas_id in ENERGY_COMMITTEE_THOMAS_IDS:
        return True
    n = (name or "").lower()
    return any(k in n for k in ENERGY_KEYWORDS)


def upsert_division(client, ocd_id, level, division_type, name, state, parent=None):
    client.table("divisions").upsert({
        "ocd_id": ocd_id, "level": level, "division_type": division_type,
        "name": name, "state": state, "parent_ocd_id": parent,
        "updated_at": datetime.utcnow().isoformat(),
    }, on_conflict="ocd_id").execute()


def upsert_politician(client, key_field, key_value, payload):
    """Idempotent without relying on DB unique constraints for openstates/cicero:
    look up by the natural key, then update or insert."""
    payload[key_field] = key_value
    payload["updated_at"] = datetime.utcnow().isoformat()
    existing = client.table("politicians").select("id").eq(key_field, key_value).limit(1).execute()
    if existing.data:
        pid = existing.data[0]["id"]
        client.table("politicians").update(payload).eq("id", pid).execute()
        return pid
    return client.table("politicians").insert(payload).execute().data[0]["id"]


def upsert_committee(client, external_id, name, level, chamber):
    row = {
        "external_id": external_id, "name": name, "level": level, "chamber": chamber,
        "is_energy_relevant": is_energy_committee(external_id, name),
        "updated_at": datetime.utcnow().isoformat(),
    }
    client.table("committees").upsert(row, on_conflict="external_id").execute()
    res = client.table("committees").select("id").eq("external_id", external_id).limit(1).execute()
    return res.data[0]["id"] if res.data else None


def link_membership(client, politician_id, committee_id, role="member", leadership=False):
    if not (politician_id and committee_id):
        return
    client.table("committee_memberships").upsert({
        "politician_id": politician_id, "committee_id": committee_id,
        "role": role, "is_leadership": leadership,
    }, on_conflict="politician_id,committee_id").execute()


# ---------------------------------------------------------------------------
# FEDERAL
# ---------------------------------------------------------------------------
def fetch_federal(client):
    print("Federal: congress-legislators…")
    legs = yaml.safe_load(requests.get(LEGISLATORS_URL, timeout=60).text)
    committees = yaml.safe_load(requests.get(COMMITTEES_URL, timeout=60).text)
    membership = yaml.safe_load(requests.get(MEMBERSHIP_URL, timeout=60).text)
    n = 0

    # committees first (so memberships can link)
    cmte_id_by_thomas = {}
    for c in committees:
        chamber = c.get("type", "")  # house / senate / joint
        cid = upsert_committee(client, c["thomas_id"], c["name"], "federal", chamber)
        cmte_id_by_thomas[c["thomas_id"]] = cid
        for sub in c.get("subcommittees", []) or []:
            sub_ext = c["thomas_id"] + (sub.get("thomas_id") or "")
            scid = upsert_committee(client, sub_ext, c["name"] + " — " + sub["name"], "federal", chamber)
            cmte_id_by_thomas[sub_ext] = scid

    # First pass: create all state divisions (needed as parents for CDs)
    states_seen = set()
    for leg in legs:
        term = (leg.get("terms") or [])[-1]
        if not term:
            continue
        state = term["state"]
        if state not in states_seen:
            states_seen.add(state)
            state_ocd = f"ocd-division/country:us/state:{state.lower()}"
            upsert_division(client, state_ocd, "federal", "state", state, state)
    
    print(f"  created {len(states_seen)} state divisions", flush=True)

    pid_by_bioguide = {}
    total_legs = len(legs)
    for idx, leg in enumerate(legs):
        term = (leg.get("terms") or [])[-1]
        if not term:
            continue
        bioguide = leg["id"]["bioguide"]
        fec = (leg["id"].get("fec") or [None])[0]
        is_sen = term["type"] == "sen"
        state = term["state"]
        district = None if is_sen else str(term.get("district", ""))

        # geography: senators map to the state division; reps to a CD
        if is_sen:
            ocd = f"ocd-division/country:us/state:{state.lower()}"
            office_type, chamber = "us_senate", "senate"
        else:
            ocd = f"ocd-division/country:us/state:{state.lower()}/cd:{district}"
            upsert_division(client, ocd, "federal", "cd", f"{state}-{district}", state,
                            parent=f"ocd-division/country:us/state:{state.lower()}")
            office_type, chamber = "us_house", "house"

        term_end = term.get("end")
        next_year = int(term_end[:4]) if term_end else None
        pid = upsert_politician(client, "bioguide_id", bioguide, {
            "name": leg["name"].get("official_full") or f"{leg['name']['first']} {leg['name']['last']}",
            "level": "federal", "office_type": office_type, "chamber": chamber,
            "party": PARTY.get(term.get("party"), term.get("party", "")[:1]),
            "state": state, "district": district, "ocd_division_id": ocd,
            "fec_candidate_id": fec, "bio": leg.get("bio", {}).get("birthday"),
            "office_phone": term.get("phone"), "website_url": term.get("url"),
            "term_start": term.get("start"), "next_election": term_end,
            "up_this_cycle": next_year == ELECTION_CYCLE, "incumbent": True,
        })
        pid_by_bioguide[bioguide] = pid
        n += 1
        if n % 50 == 0:
            print(f"  processed {n}/{total_legs} legislators...", flush=True)

    # memberships → committee_memberships (drives the "leverage" flag)
    for thomas_id, members in membership.items():
        cid = cmte_id_by_thomas.get(thomas_id)
        for m in members:
            pid = pid_by_bioguide.get(m.get("bioguide"))
            role = (m.get("title") or "member").lower()
            link_membership(client, pid, cid, role=role,
                            leadership=role in ("chair", "chairman", "ranking member"))
    print(f"  federal officials upserted: {n}")
    return n


# ---------------------------------------------------------------------------
# STATE (Open States v3)
# ---------------------------------------------------------------------------
def openstates_get(path, params):
    headers = {"X-API-KEY": OPENSTATES_API_KEY}
    r = requests.get(OPENSTATES_BASE + path, params=params, headers=headers, timeout=60)
    r.raise_for_status()
    return r.json()


def fetch_state(client, states):
    if not OPENSTATES_API_KEY:
        print("State: skipped (no OPENSTATES_API_KEY)")
        return 0
    n = 0
    for st in states:
        print(f"State: Open States — {st}…")
        page = 1
        while True:
            data = openstates_get("/people", {
                "jurisdiction": st, "per_page": 50, "page": page,
                "include": ["committee_memberships"],
            })
            for person in data.get("results", []):
                role = person.get("current_role") or {}
                org = role.get("org_classification")  # upper / lower
                ocd = role.get("division_id")
                if not ocd:
                    continue
                dtype = "sldu" if org == "upper" else "sldl"
                upsert_division(client, ocd, "state", dtype, role.get("title", ""), st)
                office_type = "state_upper" if org == "upper" else "state_lower"
                pid = upsert_politician(client, "openstates_id", person["id"], {
                    "name": person["name"], "level": "state", "office_type": office_type,
                    "chamber": org, "party": PARTY.get(role.get("party"), (role.get("party") or "")[:1]),
                    "state": st, "district": str(role.get("district", "")),
                    "ocd_division_id": ocd, "website_url": person.get("openstates_url"),
                    "office_email": (person.get("email") or None), "incumbent": True,
                })
                # state committees + memberships
                for cm in person.get("committee_memberships", []) or []:
                    cid = upsert_committee(client, cm.get("id") or cm["name"], cm["name"], "state", org)
                    link_membership(client, pid, cid, role=cm.get("role", "member"))
                n += 1
            if page >= (data.get("pagination", {}).get("max_page", page)):
                break
            page += 1
    print(f"  state officials upserted: {n}")
    return n


# ---------------------------------------------------------------------------
# LOCAL (Cicero) — best-effort; paid API, schema-specific. Pass target points.
# ---------------------------------------------------------------------------
def fetch_local(client, locations):
    if not CICERO_API_KEY:
        print("Local: skipped (no CICERO_API_KEY)")
        return 0
    n = 0
    for loc in locations:  # [{"lat":..,"lon":..,"label":..}]
        print(f"Local: Cicero — {loc.get('label')}…")
        r = requests.get(f"{CICERO_BASE}/official", params={
            "lat": loc["lat"], "lon": loc["lon"], "key": CICERO_API_KEY, "format": "json",
        }, timeout=60)
        r.raise_for_status()
        officials = (((r.json() or {}).get("response") or {}).get("results") or {}).get("officials", [])
        for o in officials:
            office = (o.get("office") or {})
            district = (office.get("district") or {})
            ocd = district.get("ocd_id") or f"cicero/{o.get('id')}"
            upsert_division(client, ocd, "local", district.get("district_type", "local"),
                            office.get("title", "Local office"), district.get("state"))
            office_type = (office.get("title") or "local_office").lower().replace(" ", "_")
            upsert_politician(client, "cicero_id", str(o.get("id")), {
                "name": f"{o.get('first_name','')} {o.get('last_name','')}".strip(),
                "level": "local", "office_type": office_type, "party": (o.get("party") or "NP")[:2],
                "state": district.get("state"), "ocd_division_id": ocd,
                "office_email": (o.get("email_addresses") or [None])[0],
                "office_phone": (o.get("phones") or [None])[0], "incumbent": True,
            })
            n += 1
    print(f"  local officials upserted: {n}")
    return n


# ---------------------------------------------------------------------------
def log_run(client, script, status, rows, started, notes=""):
    try:
        client.table("etl_runs").insert({
            "script": script, "status": status, "rows_upserted": rows,
            "started_at": started, "finished_at": datetime.utcnow().isoformat(), "notes": notes,
        }).execute()
    except Exception as e:
        print(f"(etl_runs log failed: {e})")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--federal", action="store_true")
    ap.add_argument("--state", nargs="*", metavar="ST")
    ap.add_argument("--local", action="store_true")
    args = ap.parse_args()
    run_all = not (args.federal or args.state is not None or args.local)

    client = sb()
    started = datetime.utcnow().isoformat()
    total, notes = 0, []

    try:
        if run_all or args.federal:
            total += fetch_federal(client)
        if run_all or args.state is not None:
            states = args.state if args.state else ["Texas", "California"]
            total += fetch_state(client, states)
        if run_all or args.local:
            total += fetch_local(client, locations=[])  # supply [{lat,lon,label}] per launch metro
        log_run(client, "fetch_officials", "success", total, started)
        print(f"Done. {total} officials upserted.")
    except Exception as e:
        log_run(client, "fetch_officials", "error", total, started, notes=str(e))
        raise


if __name__ == "__main__":
    main()
