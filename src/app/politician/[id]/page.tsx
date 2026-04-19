import { Metadata } from 'next'
import { supabase } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Flame, User, ExternalLink, Phone, Mail, Globe } from 'lucide-react'
import { LcvTrendBadge } from '@/components/LcvTrendBadge'
import { FossilFuelAmount } from '@/components/FossilFuelAmount'
import { PledgeBadge } from '@/components/PledgeBadge'
import { DarkMoneyDisclaimer } from '@/components/DarkMoneyDisclaimer'
import type { Politician, PoliticianSummary, Donation, LcvScore } from '@/lib/database.types'

interface PageProps {
  params: Promise<{ id: string }>
}

interface PoliticianWithRelations extends Politician {
  politician_summaries: PoliticianSummary | null
  donations: Donation[]
  lcv_scores: LcvScore[]
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const { data } = await supabase
    .from('politicians')
    .select('name, state, chamber')
    .eq('id', id)
    .single()

  const politician = data as { name: string; state: string; chamber: string } | null

  if (!politician) {
    return { title: 'Politician Not Found' }
  }

  return {
    title: `${politician.name} - Fossil Money`,
    description: `View ${politician.name}'s fossil fuel donations and climate voting record`,
    openGraph: {
      images: [`/api/og/${id}`],
    },
  }
}

export default async function PoliticianPage({ params }: PageProps) {
  const { id } = await params

  const { data, error } = await supabase
    .from('politicians')
    .select(`
      *,
      politician_summaries (*),
      donations (
        amount,
        donor_name,
        sector_tag,
        cycle_year,
        is_fossil_fuel
      ),
      lcv_scores (
        score,
        year
      )
    `)
    .eq('id', id)
    .single()

  if (error || !data) {
    notFound()
  }

  const politician = data as unknown as PoliticianWithRelations

  const summary = politician.politician_summaries as {
    total_fossil_fuel_donations: number
    total_clean_energy_donations: number
    lcv_score_trend: Record<string, number>
    latest_lcv_score: number | null
  } | null

  const fossilFuelTotal = summary?.total_fossil_fuel_donations || 0
  const lcvScores = summary?.lcv_score_trend || {}

  const partyColor = politician.party === 'D' 
    ? 'bg-blue-600' 
    : politician.party === 'R' 
    ? 'bg-red-600' 
    : 'bg-gray-600'

  const chamberLabel = politician.chamber === 'senate' ? 'Senator' : 'Representative'
  const districtLabel = politician.chamber === 'house' && politician.district 
    ? `${politician.state}-${politician.district}` 
    : politician.state

  const fossilFuelDonations = (politician.donations || [])
    .filter((d: { is_fossil_fuel: boolean }) => d.is_fossil_fuel)
    .sort((a: { cycle_year: number }, b: { cycle_year: number }) => b.cycle_year - a.cycle_year)

  return (
    <main className="min-h-screen bg-slate-900">
      <header className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link 
            href="/" 
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors w-fit"
          >
            <ArrowLeft className="w-5 h-5" />
            <Flame className="w-6 h-6 text-orange-500" />
            <span className="font-semibold text-white">Fossil Money</span>
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-slate-800 rounded-xl p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className={`relative w-24 h-24 md:w-32 md:h-32 rounded-full ${partyColor} flex items-center justify-center flex-shrink-0 overflow-hidden`}>
              {politician.photo_url ? (
                <img 
                  src={politician.photo_url} 
                  alt={politician.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-12 h-12 md:w-16 md:h-16 text-white" />
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-3xl font-bold text-white">
                  {politician.name}
                </h1>
                <span className={`px-3 py-1 rounded text-sm font-semibold text-white ${partyColor}`}>
                  {politician.party}
                </span>
              </div>
              <p className="text-lg text-slate-400 mb-3">
                {chamberLabel} - {districtLabel}
              </p>
              <PledgeBadge signed={politician.signed_nffm_pledge} />

              <div className="flex flex-wrap gap-4 mt-4">
                {politician.office_phone && (
                  <a 
                    href={`tel:${politician.office_phone}`}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
                  >
                    <Phone className="w-4 h-4" />
                    {politician.office_phone}
                  </a>
                )}
                {politician.office_email && (
                  <a 
                    href={`mailto:${politician.office_email}`}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
                  >
                    <Mail className="w-4 h-4" />
                    Email
                  </a>
                )}
                {politician.website_url && (
                  <a 
                    href={politician.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
                  >
                    <Globe className="w-4 h-4" />
                    Website
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="bg-slate-900 rounded-lg p-6">
              <h3 className="text-sm text-slate-400 uppercase tracking-wide mb-3">Total Fossil Fuel Money</h3>
              <FossilFuelAmount amount={fossilFuelTotal} />
            </div>
            <div className="bg-slate-900 rounded-lg p-6">
              <h3 className="text-sm text-slate-400 uppercase tracking-wide mb-3">LCV Score Trend</h3>
              <LcvTrendBadge scores={lcvScores} />
            </div>
          </div>

          <DarkMoneyDisclaimer />
        </div>

        {fossilFuelDonations.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-white mb-4">Fossil Fuel Donations</h2>
            <div className="bg-slate-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-900">
                      <th className="text-left px-4 py-3 text-sm font-semibold text-slate-400">Donor</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-slate-400">Sector</th>
                      <th className="text-right px-4 py-3 text-sm font-semibold text-slate-400">Amount</th>
                      <th className="text-right px-4 py-3 text-sm font-semibold text-slate-400">Year</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fossilFuelDonations.slice(0, 20).map((donation: {
                      donor_name: string | null
                      sector_tag: string | null
                      amount: number
                      cycle_year: number
                    }, i: number) => (
                      <tr key={i} className="border-t border-slate-700">
                        <td className="px-4 py-3 text-sm text-white">
                          {donation.donor_name || 'Unknown'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-400">
                          {donation.sector_tag || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-orange-400 font-medium">
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 0,
                          }).format(donation.amount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-slate-400">
                          {donation.cycle_year}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {fossilFuelDonations.length > 20 && (
                <div className="px-4 py-3 bg-slate-900 text-center text-sm text-slate-400">
                  Showing 20 of {fossilFuelDonations.length} donations
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
