import Link from 'next/link'
import { supabase } from '@/lib/db'
import { ZipSearchForm } from '@/components/forms'
import { Footer } from '@/components/layout'
import { formatMoney, getPartyAbbreviation } from '@/lib/utils'
import type { HomepageStats } from '@/lib/database.types'

interface TopRecipient {
  id: string
  name: string
  party: string | null
  state: string | null
  district: string | null
  chamber: string | null
  committee: string | null
  total_fossil_fuel_donations: number
  latest_lcv_score: number | null
}

interface PoliticianWithSummary {
  id: string
  name: string
  party: string | null
  state: string | null
  district: string | null
  chamber: string | null
  committee: string | null
  politician_summaries: {
    total_fossil_fuel_donations: number
    latest_lcv_score: number | null
  } | null
}

async function getHomepageData() {
  const [statsResult, topRecipientsResult] = await Promise.all([
    supabase.from('homepage_stats').select('*').limit(1).single(),
    supabase
      .from('politicians')
      .select(`
        id,
        name,
        party,
        state,
        district,
        chamber,
        committee,
        politician_summaries (
          total_fossil_fuel_donations,
          latest_lcv_score
        )
      `)
      .not('politician_summaries', 'is', null)
      .order('politician_summaries(total_fossil_fuel_donations)', { ascending: false })
      .limit(5)
  ])

  const stats = statsResult.data as HomepageStats | null
  const rawData = topRecipientsResult.data as PoliticianWithSummary[] | null
  const topRecipients: TopRecipient[] = (rawData || []).map((p) => ({
    id: p.id,
    name: p.name,
    party: p.party,
    state: p.state,
    district: p.district,
    chamber: p.chamber,
    committee: p.committee,
    total_fossil_fuel_donations: p.politician_summaries?.total_fossil_fuel_donations || 0,
    latest_lcv_score: p.politician_summaries?.latest_lcv_score ?? null,
  }))

  return { stats, topRecipients }
}

export default async function Home() {
  const { stats, topRecipients } = await getHomepageData()

  const maxDonation = topRecipients[0]?.total_fossil_fuel_donations || 1

  return (
    <main className="py-8 px-6 max-w-[680px] mx-auto">
      {/* Navigation */}
      <nav className="flex items-center justify-between mb-11">
        <div className="flex items-center gap-2 text-[15px] font-medium text-primary">
          <div className="w-3.5 h-3.5 bg-accent rounded-full" />
          Fossil Money
        </div>
        <div className="flex gap-5">
          <Link href="#" className="text-xs text-secondary hover:text-primary">All members</Link>
          <Link href="#" className="text-xs text-secondary hover:text-primary">By state</Link>
          <Link href="#" className="text-xs text-secondary hover:text-primary">Methodology</Link>
          <Link href="#" className="text-xs text-secondary hover:text-primary">About</Link>
        </div>
      </nav>

      {/* Hero */}
      <h1 className="text-[34px] font-medium leading-tight text-primary mb-4 max-w-[560px]">
        The fossil fuel industry <em className="not-italic border-b-2 border-accent">owns Congress</em>.<br />See the receipts.
      </h1>
      <p className="text-[15px] text-secondary leading-relaxed max-w-[500px] mb-6">
        Enter your ZIP code to see every dollar your senators and house representative have taken from oil, gas, and coal — and how they voted on climate.
      </p>

      {/* Search */}
      <ZipSearchForm />

      {/* Stat Bar */}
      <div className="grid grid-cols-4 bg-surface rounded-2xl overflow-hidden mb-8 shadow-sm">
        <div className="p-4 px-5 border-r border-border">
          <div className="text-[22px] font-medium text-accent-dark mb-1">
            {stats ? formatMoney(stats.total_fossil_fuel_donations) : '$--'}
          </div>
          <div className="text-[11px] text-secondary leading-snug">Total fossil fuel donations to current Congress</div>
        </div>
        <div className="p-4 px-5 border-r border-border">
          <div className="text-[22px] font-medium mb-1">
            {stats?.members_with_fossil_money ?? '--'}
          </div>
          <div className="text-[11px] text-secondary leading-snug">Members who took fossil fuel money this cycle</div>
          <div className="text-[11px] text-tertiary mt-1">
            {stats ? `${stats.members_with_fossil_money_pct}% of Congress` : ''}
          </div>
        </div>
        <div className="p-4 px-5 border-r border-border">
          <div className="text-[22px] font-medium text-accent-dark mb-1">
            {stats ? `${stats.avg_lcv_top_50}%` : '--%'}
          </div>
          <div className="text-[11px] text-secondary leading-snug">Avg LCV score among top 50 recipients</div>
        </div>
        <div className="p-4 px-5">
          <div className="text-[22px] font-medium mb-1">$0</div>
          <div className="text-[11px] text-secondary leading-snug">
            Fossil fuel money taken by {stats?.members_with_zero ?? '--'} members
          </div>
          <div className="text-[11px] text-tertiary mt-1">
            {stats ? `LCV avg: ${stats.avg_lcv_zero_members}%` : ''}
          </div>
        </div>
      </div>

      {/* Leaderboard Section */}
      <div className="flex items-baseline justify-between mb-3">
        <span className="text-[11px] font-medium text-tertiary uppercase tracking-wider">Top recipients this cycle</span>
        <Link href="#" className="text-xs text-secondary hover:text-primary">View all 535 members →</Link>
      </div>

      {/* Leaderboard */}
      <div className="flex flex-col gap-2 mb-8">
        {topRecipients.map((rep, index) => {
          const barWidth = (rep.total_fossil_fuel_donations / maxDonation) * 100
          const stateDisplay = rep.district ? `${rep.state}-${rep.district}` : rep.state
          const isRepublican = rep.party === 'Republican' || rep.party === 'R'

          return (
            <Link
              key={rep.id}
              href={`/politician/${rep.id}`}
              className="grid grid-cols-[24px_1fr_auto] items-center gap-3 p-3 px-4 bg-surface rounded-xl hover:bg-surface-secondary transition-colors shadow-sm"
            >
              <span className="text-xs text-tertiary text-center">{index + 1}</span>
              <div className="min-w-0">
                <div className="text-sm font-medium text-primary mb-0.5 truncate">{rep.name}</div>
                <div className="text-[11px] text-secondary flex items-center gap-2">
                  <span className="flex items-center">
                    <span className={`inline-block w-2 h-2 rounded-full mr-1 ${isRepublican ? 'bg-party-r' : 'bg-party-d'}`} />
                    {getPartyAbbreviation(rep.party)} · {stateDisplay}
                  </span>
                  <span>{rep.chamber}{rep.committee ? ` · ${rep.committee}` : ''}</span>
                </div>
                <div className="w-full h-[3px] bg-border rounded-full mt-1.5 overflow-hidden">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${barWidth}%` }} />
                </div>
              </div>
              <div className="text-right min-w-[80px]">
                <span className="text-[15px] font-medium text-accent-dark block mb-0.5">{formatMoney(rep.total_fossil_fuel_donations)}</span>
                <span className="text-[11px] text-secondary">
                  {rep.latest_lcv_score !== null ? `LCV ${rep.latest_lcv_score}%` : 'LCV --'}
                </span>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Footer */}
      <Footer />
    </main>
  )
}
