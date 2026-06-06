import { NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import type { NationalStats } from '@/lib/database.types'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('homepage_stats')
      .select('*')
      .eq('id', 1)
      .single()

    if (error) {
      console.error('Error fetching homepage stats:', error)
      return NextResponse.json(
        { error: 'Failed to fetch national statistics' },
        { status: 500 }
      )
    }

    const d = data as any
    const stats: NationalStats = {
      totalFossil: d?.total_fossil_fuel_donations ?? 0,
      fossilPctOfTotal: d?.fossil_pct_of_total ?? 0,
      totalCleanEnergy: d?.total_clean_energy_donations ?? 0,
      pledgeSigners: d?.pledge_signers ?? 0,
      asOfLabel: d?.as_of_label ?? 'U.S. Congress · 2023–2024 cycle',
      officialsTracked: d?.officials_tracked ?? 0
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error in national stats API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
