import Link from 'next/link'
import { supabase } from '@/lib/db'
import { ZipSearchForm } from '@/components/ZipSearchForm'
import type { HomepageStats } from '@/lib/database.types'

function formatMoney(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(0)}K`
  }
  return `$${amount.toFixed(0)}`
}

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
        <div className="flex items-center gap-[7px] text-[15px] font-medium text-[var(--color-text-primary)]">
          <div className="w-[14px] h-[14px] bg-[#D85A30] rounded-full" />
          Fossil Money
        </div>
        <div className="flex gap-[18px]">
          <Link href="#" className="text-xs text-[var(--color-text-secondary)] no-underline hover:text-[var(--color-text-primary)]">All members</Link>
          <Link href="#" className="text-xs text-[var(--color-text-secondary)] no-underline hover:text-[var(--color-text-primary)]">By state</Link>
          <Link href="#" className="text-xs text-[var(--color-text-secondary)] no-underline hover:text-[var(--color-text-primary)]">Methodology</Link>
          <Link href="#" className="text-xs text-[var(--color-text-secondary)] no-underline hover:text-[var(--color-text-primary)]">About</Link>
        </div>
      </nav>

      {/* Hero */}
      <h1 className="text-[34px] font-medium leading-[1.18] text-[var(--color-text-primary)] mb-4 max-w-[560px]">
        The fossil fuel industry <em className="not-italic border-b-2 border-[#D85A30]">owns Congress</em>.<br />See the receipts.
      </h1>
      <p className="text-[15px] text-[var(--color-text-secondary)] leading-[1.65] max-w-[500px] mb-6">
        Enter your ZIP code to see every dollar your senators and house representative have taken from oil, gas, and coal — and how they voted on climate.
      </p>

      {/* Search */}
      <ZipSearchForm />

      {/* Stat Bar */}
      <div className="grid grid-cols-4 bg-[var(--color-background-primary)] rounded-2xl overflow-hidden mb-8 shadow-sm">
        <div className="p-4 px-5 border-r border-[var(--color-border-tertiary)]">
          <div className="text-[22px] font-medium text-[#993C1D] mb-[3px]">
            {stats ? formatMoney(stats.total_fossil_fuel_donations) : '$--'}
          </div>
          <div className="text-[11px] text-[var(--color-text-secondary)] leading-[1.4]">Total fossil fuel donations to current Congress</div>
        </div>
        <div className="p-4 px-5 border-r border-[var(--color-border-tertiary)]">
          <div className="text-[22px] font-medium mb-[3px]">
            {stats?.members_with_fossil_money ?? '--'}
          </div>
          <div className="text-[11px] text-[var(--color-text-secondary)] leading-[1.4]">Members who took fossil fuel money this cycle</div>
          <div className="text-[11px] text-[var(--color-text-tertiary)] mt-[3px]">
            {stats ? `${stats.members_with_fossil_money_pct}% of Congress` : ''}
          </div>
        </div>
        <div className="p-4 px-5 border-r border-[var(--color-border-tertiary)]">
          <div className="text-[22px] font-medium text-[#993C1D] mb-[3px]">
            {stats ? `${stats.avg_lcv_top_50}%` : '--%'}
          </div>
          <div className="text-[11px] text-[var(--color-text-secondary)] leading-[1.4]">Avg LCV score among top 50 recipients</div>
        </div>
        <div className="p-4 px-5">
          <div className="text-[22px] font-medium mb-[3px]">$0</div>
          <div className="text-[11px] text-[var(--color-text-secondary)] leading-[1.4]">
            Fossil fuel money taken by {stats?.members_with_zero ?? '--'} members
          </div>
          <div className="text-[11px] text-[var(--color-text-tertiary)] mt-[3px]">
            {stats ? `LCV avg: ${stats.avg_lcv_zero_members}%` : ''}
          </div>
        </div>
      </div>

      {/* Leaderboard Section */}
      <div className="flex items-baseline justify-between mb-[0.875rem]">
        <span className="text-[11px] font-medium text-[var(--color-text-tertiary)] uppercase tracking-[0.06em]">Top recipients this cycle</span>
        <Link href="#" className="text-xs text-[var(--color-text-secondary)] no-underline hover:text-[var(--color-text-primary)]">View all 535 members →</Link>
      </div>

      {/* Leaderboard */}
      <div className="flex flex-col gap-2 mb-8">
        {topRecipients.map((rep, index) => {
          const barWidth = (rep.total_fossil_fuel_donations / maxDonation) * 100
          const stateDisplay = rep.district ? `${rep.state}-${rep.district}` : rep.state

          return (
            <Link
              key={rep.id}
              href={`/politician/${rep.id}`}
              className="grid grid-cols-[24px_1fr_auto] items-center gap-3 p-[0.875rem_1rem] bg-[var(--color-background-primary)] rounded-xl cursor-pointer hover:bg-[var(--color-background-secondary)] no-underline transition-colors shadow-sm"
            >
              <span className="text-xs text-[var(--color-text-tertiary)] text-center">{index + 1}</span>
              <div className="min-w-0">
                <div className="text-sm font-medium text-[var(--color-text-primary)] mb-[2px] whitespace-nowrap overflow-hidden text-ellipsis">{rep.name}</div>
                <div className="text-[11px] text-[var(--color-text-secondary)] flex items-center gap-2">
                  <span className="flex items-center">
                    <span className={`inline-block w-[7px] h-[7px] rounded-full mr-1 ${rep.party === 'Republican' || rep.party === 'R' ? 'bg-[#E24B4A]' : 'bg-[#378ADD]'}`} />
                    {rep.party?.charAt(0)} · {stateDisplay}
                  </span>
                  <span>{rep.chamber}{rep.committee ? ` · ${rep.committee}` : ''}</span>
                </div>
                <div className="w-full h-[3px] bg-[var(--color-border-tertiary)] rounded-full mt-[6px] overflow-hidden">
                  <div className="h-full rounded-full bg-[#D85A30]" style={{ width: `${barWidth}%` }} />
                </div>
              </div>
              <div className="text-right min-w-[80px]">
                <span className="text-[15px] font-medium text-[#993C1D] block mb-[2px]">{formatMoney(rep.total_fossil_fuel_donations)}</span>
                <span className="text-[11px] text-[var(--color-text-secondary)]">
                  {rep.latest_lcv_score !== null ? `LCV ${rep.latest_lcv_score}%` : 'LCV --'}
                </span>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border-tertiary)]">
        <span className="text-[11px] text-[var(--color-text-tertiary)]">Data: FEC filings · WhoBoughtMyRep · LCV Scorecard 2024. Disclosed contributions only.</span>
        <div className="flex gap-[14px]">
          <Link href="#" className="text-[11px] text-[var(--color-text-tertiary)] no-underline hover:text-[var(--color-text-secondary)]">GitHub</Link>
          <Link href="#" className="text-[11px] text-[var(--color-text-tertiary)] no-underline hover:text-[var(--color-text-secondary)]">Methodology</Link>
          <span className="text-[11px] text-[var(--color-text-tertiary)]">Updated May 2026</span>
        </div>
      </div>
    </main>
  )
}
