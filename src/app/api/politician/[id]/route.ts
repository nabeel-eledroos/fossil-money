import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import type { PoliticianProfile, Level, Party, PledgeStatus } from '@/lib/database.types'

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

function getOfficeTitle(politician: any): string {
  const { chamber, office_type, district, level } = politician
  
  if (chamber === 'senate') return 'U.S. Senator'
  if (chamber === 'house') return `U.S. House — District ${district}`
  
  if (level === 'state') {
    if (office_type === 'governor') return 'Governor'
    if (office_type === 'state_upper') return `State Senate — Dist. ${district}`
    if (office_type === 'state_lower') return `State House — Dist. ${district}`
  }
  
  if (level === 'local') {
    if (office_type?.includes('mayor')) return 'Mayor'
    if (office_type?.includes('council')) return `City Council — Dist. ${district}`
    if (office_type?.includes('commission')) return 'County Commissioner'
  }
  
  return office_type?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) ?? 'Official'
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const { data: politician, error } = await supabase
      .from('politicians')
      .select(`
        *,
        politician_summaries (*),
        donations (
          amount,
          donor_name,
          donor_type,
          employer,
          sector_tag,
          industry_subsector,
          is_fossil_fuel,
          is_clean_energy,
          cycle_year,
          source_url
        ),
        lcv_scores (
          score,
          year,
          scope,
          score_type
        )
      `)
      .eq('id', id)
      .single()

    if (error || !politician) {
      return NextResponse.json(
        { error: 'Politician not found' },
        { status: 404 }
      )
    }

    const p = politician as any
    const summary = p.politician_summaries
    
    if (summary?.profile) {
      return NextResponse.json({
        ...p,
        profile: summary.profile
      })
    }

    const fossilDonations = (p.donations || []).filter((d: any) => d.is_fossil_fuel)
    const fossilDirect = fossilDonations.reduce((sum: number, d: any) => sum + (d.amount || 0), 0)
    const totalRaised = p.total_raised || summary?.total_raised || 0
    const cleanEnergy = summary?.total_clean_energy_donations || 
      (p.donations || []).filter((d: any) => d.is_clean_energy).reduce((sum: number, d: any) => sum + (d.amount || 0), 0)

    const subIndustry = summary?.subsector_breakdown || {
      oil_gas: 0, coal: 0, utilities: 0, mining: 0
    }
    
    const donorSplit = summary?.pac_vs_individual || {
      pac: fossilDonations.filter((d: any) => d.donor_type === 'PAC').reduce((sum: number, d: any) => sum + (d.amount || 0), 0),
      individual: fossilDonations.filter((d: any) => d.donor_type !== 'PAC').reduce((sum: number, d: any) => sum + (d.amount || 0), 0)
    }

    const yearlyMap: Record<string, number> = {}
    fossilDonations.forEach((d: any) => {
      const year = String(d.cycle_year)
      yearlyMap[year] = (yearlyMap[year] || 0) + (d.amount || 0)
    })
    const yearly = Object.entries(yearlyMap)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([y, v]) => ({ y, v }))

    const donorMap: Record<string, { amt: number, sector: string, type: string, employer: string | null }> = {}
    fossilDonations.forEach((d: any) => {
      const name = d.donor_name || 'Unknown'
      if (!donorMap[name]) {
        donorMap[name] = { amt: 0, sector: d.industry_subsector || 'oil_gas', type: d.donor_type || 'Individual', employer: d.employer || null }
      }
      donorMap[name].amt += d.amount || 0
    })
    const donors = Object.entries(donorMap)
      .sort(([, a], [, b]) => b.amt - a.amt)
      .slice(0, 6)
      .map(([n, { amt, sector, type, employer }]) => ({ n, amt, sector, type: type as 'PAC' | 'Individual', employer }))

    const lcvScores = p.lcv_scores || []
    const latestLcv = lcvScores.length > 0 
      ? lcvScores.sort((a: any, b: any) => b.year - a.year)[0]?.score 
      : summary?.latest_lcv_score ?? null
    
    const lcvHist = lcvScores
      .sort((a: any, b: any) => a.year - b.year)
      .slice(-5)
      .map((s: any) => ({ y: String(s.year), s: s.score || 0 }))

    const profile: PoliticianProfile = {
      id: p.id,
      name: p.name,
      office: getOfficeTitle(p),
      level: (p.level || 'federal') as Level,
      party: normalizeParty(p.party),
      state: p.state || '',
      initials: getInitials(p.name),
      photoUrl: p.photo_url ?? null,
      committee: p.committee || null,
      committeeLeverage: summary?.committee_leverage ?? false,
      since: p.term_start?.slice(0, 4) || '—',
      next: p.next_election?.slice(0, 4) || '—',
      upThisCycle: p.up_this_cycle ?? false,
      lastMargin: p.last_margin || '—',
      totalRaised,
      fossilDirect,
      fossilPct: totalRaised > 0 ? Math.round((fossilDirect / totalRaised) * 100) : 0,
      outsideFossil: summary?.total_outside_fossil ?? 0,
      cleanEnergy,
      lcv: latestLcv,
      localScore: summary?.local_grade ?? null,
      lcvHist,
      pledge: (p.pledge_status || (p.signed_nffm_pledge ? 'signed' : 'none')) as PledgeStatus,
      pledgeSignedDate: p.pledge_signed_date || undefined,
      subIndustry,
      donorSplit,
      yearly,
      donors,
      votes: summary?.key_votes || [],
      lobbying: summary?.fossil_lobbying_total ? {
        annual: summary.fossil_lobbying_total,
        note: `spent lobbying their committees in 2024`,
        firms: summary.fossil_lobbying_top || []
      } : null,
      holdings: summary?.holdings || [],
      stakes: summary?.district_stakes || [],
      election: {
        challengers: []
      },
      sources: {
        money: 'FEC API · OpenSecrets',
        moneySynced: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      },
      flagged: summary?.flagged ?? false
    }

    return NextResponse.json({
      ...p,
      profile
    })
  } catch (error) {
    console.error('Error fetching politician:', error)
    return NextResponse.json(
      { error: 'Failed to fetch politician details' },
      { status: 500 }
    )
  }
}
