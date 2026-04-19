import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'

interface PoliticianData {
  id: string
  name: string
  party: string | null
  chamber: string | null
  state: string | null
  politician_summaries: {
    total_fossil_fuel_donations: number
    latest_lcv_score: number | null
  } | null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    const { data: politician } = await supabase
      .from('politicians')
      .select(`
        *,
        politician_summaries (*)
      `)
      .eq('id', id)
      .single()

    if (!politician) {
      return new Response('Politician not found', { status: 404 })
    }

    const pol = politician as unknown as PoliticianData
    const summary = pol.politician_summaries

    const fossilFuelTotal = summary?.total_fossil_fuel_donations || 0
    const lcvScore = summary?.latest_lcv_score || 0

    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(fossilFuelTotal)

    const partyColor = pol.party === 'D' ? '#3B82F6' : pol.party === 'R' ? '#EF4444' : '#6B7280'
    const lcvColor = lcvScore >= 70 ? '#22C55E' : lcvScore >= 40 ? '#F59E0B' : '#EF4444'

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0F172A',
            padding: 40,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#1E293B',
              borderRadius: 24,
              padding: 48,
              width: '100%',
              maxWidth: 1000,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 24,
                marginBottom: 32,
              }}
            >
              <div
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  backgroundColor: partyColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 48,
                  color: 'white',
                  fontWeight: 'bold',
                }}
              >
                {pol.name.charAt(0)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 48, fontWeight: 'bold', color: 'white' }}>
                  {pol.name}
                </div>
                <div style={{ fontSize: 24, color: '#94A3B8' }}>
                  {pol.chamber === 'senate' ? 'Senator' : 'Representative'} ({pol.party}) - {pol.state}
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 48,
                marginTop: 24,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: 24,
                  backgroundColor: '#334155',
                  borderRadius: 16,
                }}
              >
                <div style={{ fontSize: 20, color: '#94A3B8', marginBottom: 8 }}>
                  Fossil Fuel Money
                </div>
                <div style={{ fontSize: 40, fontWeight: 'bold', color: '#EF4444' }}>
                  {formattedAmount}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: 24,
                  backgroundColor: '#334155',
                  borderRadius: 16,
                }}
              >
                <div style={{ fontSize: 20, color: '#94A3B8', marginBottom: 8 }}>
                  LCV Score
                </div>
                <div style={{ fontSize: 40, fontWeight: 'bold', color: lcvColor }}>
                  {lcvScore}%
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 32,
                fontSize: 18,
                color: '#64748B',
              }}
            >
              fosssilmoney.org
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (error) {
    console.error('Error generating OG image:', error)
    return new Response('Failed to generate image', { status: 500 })
  }
}
