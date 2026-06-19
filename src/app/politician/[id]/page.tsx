'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import type { PoliticianProfile } from '@/lib/database.types'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import {
  PoliticianHeader,
  PledgeStatus,
  KeyStats,
  ContributionsOverTime,
  IndustryBreakdown,
  TopDonors,
  OutsideMoney,
  EnvironmentalRecord,
  VotesPanel,
  LobbyingHoldings,
  DistrictStakes,
  ElectionPanel,
  EmailComposer
} from '@/components/politician'

export default function PoliticianPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [profile, setProfile] = useState<PoliticianProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/politician/${id}`)
      .then(res => res.json())
      .then(d => {
        if (d.error) throw new Error(d.error)
        setProfile(d.profile)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-hair border-t-crude rounded-full animate-spin mb-4" />
        <p className="text-text-soft">Loading profile...</p>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-lg font-semibold text-ink mb-2">Profile not found</h2>
        <p className="text-text-soft text-center max-w-md mb-6">{error}</p>
        <Link href="/" className="px-6 py-3 bg-ink text-white rounded-[9px] font-semibold">Go back home</Link>
      </div>
    )
  }

  const p = profile
  const recordPct = p.lcv !== null ? p.lcv : (p.localScore === 'A' ? 92 : p.localScore === 'B−' ? 72 : p.localScore === 'B' ? 68 : p.localScore === 'D' ? 28 : 50)
  const isFlagged = (p.fossilDirect > 100000 && recordPct < 25) || p.pledge === 'broke'

  return (
    <>
      <Header maxWidth="1000px" />

      <section className="max-w-[1000px] mx-auto px-[clamp(20px,5vw,72px)] py-[clamp(26px,4vw,52px)] pb-[110px]">
        {/* Back */}
        <div 
          onClick={() => window.history.back()} 
          className="text-[14px] font-medium text-text-soft cursor-pointer inline-flex gap-[8px] items-center mb-[20px] hover:text-ink transition-colors"
        >
          ← Back to your representatives
        </div>

        <PoliticianHeader profile={p} />
        <PledgeStatus pledge={p.pledge} />
        <KeyStats profile={p} isFlagged={isFlagged} />
        <ContributionsOverTime yearly={p.yearly} sources={p.sources} />

        {/* Industry + Donors Grid */}
        <div className="grid grid-cols-2 gap-[18px] mt-[18px] max-lg:grid-cols-1">
          <IndustryBreakdown subIndustry={p.subIndustry} donorSplit={p.donorSplit} />
          <TopDonors donors={p.donors} />
        </div>

        <OutsideMoney outsideFossil={p.outsideFossil} fossilDirect={p.fossilDirect} />
        <EnvironmentalRecord lcv={p.lcv} lcvHist={p.lcvHist} localScore={p.localScore} />
        <VotesPanel votes={p.votes} lcv={p.lcv} />
        <LobbyingHoldings lobbying={p.lobbying} holdings={p.holdings} />
        <DistrictStakes stakes={p.stakes} />
        <ElectionPanel 
          upThisCycle={p.upThisCycle} 
          next={p.next} 
          lastMargin={p.lastMargin} 
          since={p.since} 
        />
        <EmailComposer
          id={id}
          name={p.name}
          office={p.office}
          fossilDirect={p.fossilDirect}
          fossilPct={p.fossilPct}
          outsideFossil={p.outsideFossil}
          lcv={p.lcv}
        />
      </section>

      <Footer maxWidth="1000px" />
    </>
  )
}
