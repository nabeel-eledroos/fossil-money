import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { RepsResponse, RepCard, CoverageStatus, Level, PledgeStatus, Party } from '@/lib/database.types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// const LEVELS: Level[] = ['federal', 'state', 'local']

function stateOf(ocdId: string): string | null {
  const match = ocdId.match(/state:([a-z]{2})/)
  return match ? match[1].toUpperCase() : null
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function normalizeParty(party: string | null): Party {
  if (!party) return 'NP'
  const p = party.toUpperCase()
  if (p === 'D' || p === 'DEMOCRAT' || p === 'DEMOCRATIC') return 'D'
  if (p === 'R' || p === 'REPUBLICAN') return 'R'
  if (p === 'I' || p === 'INDEPENDENT') return 'I'
  return 'NP'
}

async function resolveCoverage(
  ocdIds: string[],
  state: string | null
): Promise<Record<Level, CoverageStatus>> {
  const { data } = await supabase.from('coverage').select('*')
  
  const pick = (level: Level): CoverageStatus => {
    const rows = (data ?? []).filter(r => r.level === level)
    const found = (
      rows.find(r => ocdIds.includes(r.scope)) ??
      rows.find(r => r.scope === state) ??
      rows.find(r => r.scope === 'us') ??
      { status: 'pending' }
    )
    return found.status as CoverageStatus
  }
  
  return {
    federal: pick('federal'),
    state: pick('state'),
    local: pick('local')
  }
}

export async function GET(request: NextRequest) {
  const zip = request.nextUrl.searchParams.get('zip')?.trim()
  
  if (!zip || !/^\d{5}$/.test(zip)) {
    return NextResponse.json(
      { error: 'valid 5-digit zip required' },
      { status: 400 }
    )
  }

  try {
    const { data: zd } = await supabase
      .from('zip_to_division')
      .select('ocd_id')
      .eq('zip_code', zip)
    
    let ocdIds = (zd ?? []).map(r => r.ocd_id)
    let state = ocdIds.map(stateOf).find(Boolean) ?? null

    if (ocdIds.length === 0) {
      const { data: oldZip } = await supabase
        .from('zip_to_district')
        .select('state, congressional_district')
        .eq('zip_code', zip)
        .single()
      
      if (oldZip && oldZip.state) {
        const s = oldZip.state
        state = s
        // Parse district, removing leading zeros (MN-04 -> 4)
        const districtRaw = oldZip.congressional_district.split('-')[1]
        const district = parseInt(districtRaw, 10).toString()
        const stateLower = s.toLowerCase()
        ocdIds = [
          `ocd-division/country:us/state:${stateLower}`,
          `ocd-division/country:us/state:${stateLower}/cd:${district}`
        ]
      }
    }

    if (!state && ocdIds.length === 0) {
      return NextResponse.json(
        { error: `No coverage data for ZIP ${zip}` },
        { status: 404 }
      )
    }

    const coverage = await resolveCoverage(ocdIds, state)

    // Fetch politicians by OCD ID or state
    let pols: any[] = []
    
    if (ocdIds.length > 0) {
      // Fetch by OCD IDs (house members + state-level reps)
      const { data: ocdPols } = await supabase
        .from('politicians')
        .select('*, politician_summaries (*)')
        .in('ocd_division_id', ocdIds)
      
      // Also fetch senators for this state
      const { data: senators } = await supabase
        .from('politicians')
        .select('*, politician_summaries (*)')
        .eq('state', state)
        .eq('chamber', 'senate')
      
      pols = [...(ocdPols ?? []), ...(senators ?? [])]
    } else if (state) {
      const { data: statePols } = await supabase
        .from('politicians')
        .select('*, politician_summaries (*)')
        .eq('state', state)
      pols = statePols ?? []
    }

    const allPols = pols ?? []

    // Dedupe by ID (senators might be fetched twice)
    const seenIds = new Set<string>()
    const dedupedPols = allPols.filter(p => {
      if (seenIds.has(p.id)) return false
      seenIds.add(p.id)
      return true
    })

    const federalPols = dedupedPols.filter(p => p.level === 'federal' || p.chamber === 'senate' || p.chamber === 'house')
    const statePols = dedupedPols.filter(p => p.level === 'state')
    const localPols = dedupedPols.filter(p => p.level === 'local')

    const toRepCard = (p: any): RepCard => {
      const summary = p.politician_summaries
      const fossilDirect = summary?.total_fossil_fuel_donations ?? 0
      const totalRaised = p.total_raised ?? summary?.total_raised ?? 0
      const lcv = summary?.latest_lcv_score ?? null
      
      let office = p.chamber === 'senate' ? 'U.S. Senator' 
        : p.chamber === 'house' ? `U.S. House — District ${p.district}`
        : p.office_type?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) ?? 'Official'
      
      if (p.level === 'state') {
        office = p.office_type === 'governor' ? 'Governor'
          : p.office_type === 'state_upper' ? `State Senate — Dist. ${p.district}`
          : p.office_type === 'state_lower' ? `State House — Dist. ${p.district}`
          : office
      }

      return {
        id: p.id,
        name: p.name,
        office,
        level: (p.level ?? 'federal') as Level,
        party: normalizeParty(p.party),
        initials: getInitials(p.name),
        photoUrl: p.photo_url ?? null,
        fossilDirect,
        totalRaised,
        fossilPct: totalRaised > 0 ? Math.round((fossilDirect / totalRaised) * 100) : 0,
        outsideFossil: summary?.total_outside_fossil ?? 0,
        lcv,
        localScore: summary?.local_grade ?? null,
        pledge: (p.pledge_status ?? (p.signed_nffm_pledge ? 'signed' : 'unknown')) as PledgeStatus,
        committeeLeverage: summary?.committee_leverage ?? false,
        since: p.term_start?.slice(0, 4) ?? '—',
        flagged: summary?.flagged ?? false
      }
    }

    const response: RepsResponse = {
      zip,
      state,
      coverage,
      officials: {
        federal: federalPols.map(toRepCard),
        state: coverage.state === 'live' ? statePols.map(toRepCard) : [],
        local: coverage.local === 'live' ? localPols.map(toRepCard) : []
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching representatives:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch representatives' },
      { status: 500 }
    )
  }
}
