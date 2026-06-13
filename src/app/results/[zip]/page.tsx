'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { RepsResponse, RepCard, Level, CoverageStatus } from '@/lib/database.types'

function formatMoney(n: number): string {
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return '$' + Math.round(n / 1e3) + 'K'
  return '$' + n
}

interface Tier {
  key: string
  level: Level
  note: string
  status: CoverageStatus
  officials: RepCard[]
}

function PoliticianCard({ card, maxFossil }: { card: RepCard; maxFossil: number }) {
  const fossilPct = card.fossilPct
  const recordPct = card.lcv !== null ? card.lcv : (card.localScore === 'A' ? 92 : card.localScore === 'B−' ? 72 : card.localScore === 'B' ? 68 : card.localScore === 'D' ? 28 : 50)
  const isFlagged = (card.fossilDirect > 100000 && recordPct < 25) || card.pledge === 'broke'
  const recLabel = card.lcv !== null ? card.lcv : card.localScore

  const pledgeChip = card.pledge === 'signed' 
    ? <span className="chip pledge-signed">✓ Pledged</span>
    : card.pledge === 'broke' 
    ? <span className="chip pledge-broke">⚠ Broke pledge</span>
    : null

  const leverChip = card.committeeLeverage ? <span className="chip lever">Energy cmte</span> : null

  return (
    <Link href={`/politician/${card.id}`}>
      <article className="bg-surface border border-hair rounded-[14px] overflow-hidden cursor-pointer transition-all duration-200 flex flex-col relative hover:border-hair-strong hover:-translate-y-[3px] hover:shadow-[0_16px_40px_-28px_rgba(23,22,15,0.4)]">
        {isFlagged && (
          <div className="absolute top-[14px] right-[16px] text-[10.5px] font-semibold text-alarm flex items-center gap-[5px]">
            <span className="w-[6px] h-[6px] rounded-full bg-alarm" />
            Flagged
          </div>
        )}
        
        <div className="flex gap-[14px] p-[20px_20px_16px] items-start">
          <div className="w-[48px] h-[48px] rounded-full flex-none bg-bg border border-hair-strong flex items-center justify-center font-display font-semibold text-[16px] text-text-soft overflow-hidden">
            {card.photoUrl ? (
              <Image 
                src={card.photoUrl} 
                alt={card.name}
                width={48}
                height={48}
                className="object-cover w-full h-full"
              />
            ) : (
              card.initials
            )}
          </div>
          <div className="flex-1">
            <h4 className="font-body font-bold text-[18px] leading-[1.15] text-ink">{card.name}</h4>
            <div className="text-[13.5px] text-text-soft mt-[2px]">{card.office}</div>
            <div className="flex gap-[6px] flex-wrap mt-[9px]">
              <span className={`chip party-${card.party === 'D' ? 'd' : card.party === 'R' ? 'r' : 'np'}`}>
                {card.party === 'NP' ? 'Nonpartisan' : card.party}
              </span>
              {pledgeChip}
              {leverChip}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 border-t border-hair">
          <div className="p-[15px_16px] border-r border-hair">
            <div className="text-[10px] font-semibold tracking-[0.08em] uppercase text-text-mute">Fossil $</div>
            <div className="font-bold text-[20px] mt-[6px] tracking-[-0.02em] font-display text-crude-deep">{formatMoney(card.fossilDirect)}</div>
            <div className="meter crude mt-[9px]">
              <i style={{ width: `${Math.max(3, Math.round(card.fossilDirect / maxFossil * 100))}%` }} />
            </div>
          </div>
          <div className="p-[15px_16px] border-r border-hair">
            <div className="text-[10px] font-semibold tracking-[0.08em] uppercase text-text-mute">of funding</div>
            <div className="font-bold text-[20px] mt-[6px] tracking-[-0.02em] font-display text-crude-deep">{fossilPct}%</div>
            <div className="text-[11px] text-text-mute mt-[3px]">{formatMoney(card.totalRaised)} raised</div>
          </div>
          <div className="p-[15px_16px]">
            <div className="text-[10px] font-semibold tracking-[0.08em] uppercase text-text-mute">{card.lcv !== null ? 'LCV' : 'Enviro'}</div>
            <div className="font-bold text-[20px] mt-[6px] tracking-[-0.02em] font-display text-leaf-deep">{recLabel}</div>
            <div className="meter leaf mt-[9px]">
              <i style={{ width: `${recordPct}%` }} />
            </div>
          </div>
        </div>

        <div className="mt-auto p-[13px_20px] border-t border-hair flex justify-between items-center text-[12.5px] text-text-mute">
          <span>{card.outsideFossil > 0 ? `+ ${formatMoney(card.outsideFossil)} outside spending` : `In office since ${card.since}`}</span>
          <span className="text-ink font-semibold">Full profile →</span>
        </div>
      </article>
    </Link>
  )
}

function TierPending({ tier }: { tier: Tier }) {
  return (
    <div className="flex gap-[20px] items-start border border-dashed border-hair-strong rounded-[14px] p-[26px_clamp(20px,3vw,30px)] bg-[repeating-linear-gradient(135deg,transparent,transparent_11px,rgba(23,22,15,0.012)_11px,rgba(23,22,15,0.012)_22px)]">
      <div className="w-[42px] h-[42px] rounded-[11px] border border-dashed border-hair-strong flex items-center justify-center text-text-mute text-[18px] flex-none">▢</div>
      <div>
        <h4 className="font-body text-[16.5px] font-bold text-ink mb-[6px] tracking-normal">Local officials are rolling out city by city</h4>
        <p className="text-[14.5px] text-text-soft leading-[1.5] max-w-[580px] mb-[14px]">
          Mayors, city council, and county seats — with the same fossil-money, lobbying, voting, and district-stakes detail as above — are added per region via local records. This slot fills in automatically once your area is covered.
        </p>
        <button className="font-body font-semibold text-[14px] px-[22px] py-[13px] rounded-[9px] border border-hair-strong bg-transparent text-ink cursor-pointer transition-[border-color] duration-200 inline-flex items-center gap-[9px] hover:border-ink">
          Request my city →
        </button>
      </div>
    </div>
  )
}

export default function ResultsPage({ params }: { params: Promise<{ zip: string }> }) {
  const { zip } = use(params)
  const router = useRouter()
  const [data, setData] = useState<RepsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchZip, setSearchZip] = useState(zip)

  useEffect(() => {
    fetch(`/api/reps?zip=${zip}`)
      .then(res => res.json())
      .then(d => {
        if (d.error) throw new Error(d.error)
        setData(d)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [zip])

  const lookup = () => {
    const z = searchZip.trim()
    if (/^\d{5}$/.test(z)) {
      router.push(`/results/${z}`)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-hair border-t-crude rounded-full animate-spin mb-4" />
        <p className="text-text-soft">Loading representatives for {zip}...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-lg font-semibold text-ink mb-2">Unable to find representatives</h2>
        <p className="text-text-soft text-center max-w-md mb-6">{error}</p>
        <Link href="/" className="px-6 py-3 bg-ink text-white rounded-[9px] font-semibold">
          Try another ZIP code
        </Link>
      </div>
    )
  }

  const liveTiers: Tier[] = [
    { key: 'Federal', level: 'federal', note: 'You vote for these', status: data.coverage.federal, officials: data.officials.federal },
    { key: 'State', level: 'state', note: 'Statewide & district', status: data.coverage.state, officials: data.officials.state },
    { key: 'Local', level: 'local', note: 'City & county', status: data.coverage.local, officials: data.officials.local }
  ]

  const liveOfficials = liveTiers
    .filter(t => t.status === 'live')
    .flatMap(t => t.officials)

  const maxFossil = Math.max(...liveOfficials.map(p => p.fossilDirect), 1)
  const totalFossil = liveOfficials.reduce((s, p) => s + p.fossilDirect, 0)
  const avgPct = liveOfficials.length > 0 ? Math.round(liveOfficials.reduce((s, p) => s + p.fossilPct, 0) / liveOfficials.length) : 0
  const lcvOfficials = liveOfficials.filter(p => p.lcv !== null)
  const avgLcv = lcvOfficials.length > 0 ? Math.round(lcvOfficials.reduce((s, p) => s + (p.lcv || 0), 0) / lcvOfficials.length) : null
  const pledgedCount = liveOfficials.filter(p => p.pledge === 'signed').length

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-[clamp(20px,5vw,72px)] py-[18px] bg-[rgba(250,249,246,0.82)] backdrop-blur-[12px] border-b border-hair">
        <Link href="/" className="flex items-center gap-[11px] cursor-pointer">
          <div className="w-[22px] h-[22px] rounded-full border-[1.5px] border-ink relative flex-none">
            <div className="absolute inset-[4px] rounded-full bg-crude" />
          </div>
          <b className="font-display font-bold text-[18px] text-ink">Fossil&nbsp;Money</b>
        </Link>
        <nav className="flex gap-[26px] items-center">
          <Link href="/" className="text-[14px] font-medium text-text-soft cursor-pointer hover:text-ink transition-colors">Data sources</Link>
          <Link href="/#method" className="text-[14px] font-medium text-text-soft cursor-pointer hover:text-ink transition-colors">Methodology</Link>
        </nav>
      </header>

      <section className="max-w-[1120px] mx-auto px-[clamp(20px,5vw,72px)] py-[clamp(32px,5vw,64px)] pb-[100px]">
        {/* Back link */}
        <Link href="/" className="text-[14px] font-medium text-text-soft cursor-pointer inline-flex gap-[8px] items-center mb-[30px] hover:text-ink transition-colors">
          ← New search
        </Link>

        {/* Header */}
        <div className="flex flex-wrap justify-between items-end gap-[16px]">
          <div>
            <span className="label block mb-[14px]">Representatives for</span>
            <h2 className="font-display text-[clamp(30px,5vw,52px)] font-bold tracking-[-0.03em]">
              ZIP {zip} · {data.state || 'Unknown'}
            </h2>
          </div>
        </div>

        {/* Recount Stats */}
        <div className="flex flex-wrap mt-[36px] mb-[8px] border border-hair rounded-[14px] overflow-hidden">
          <div className="flex-1 min-w-[150px] p-[22px_24px] border-l border-hair first:border-l-0 max-md:min-w-[50%] max-md:[&:nth-child(odd)]:border-l-0">
            <div className="font-display text-[34px] font-bold leading-none tracking-[-0.03em] text-crude-deep">{formatMoney(totalFossil)}</div>
            <div className="text-[12.5px] text-text-soft mt-[10px]">Fossil $ across your reps</div>
          </div>
          <div className="flex-1 min-w-[150px] p-[22px_24px] border-l border-hair max-md:min-w-[50%]">
            <div className="font-display text-[34px] font-bold leading-none tracking-[-0.03em] text-crude-deep">{avgPct}%</div>
            <div className="text-[12.5px] text-text-soft mt-[10px]">Avg. share of their funding</div>
          </div>
          <div className="flex-1 min-w-[150px] p-[22px_24px] border-l border-hair max-md:min-w-[50%] max-md:border-l-0 max-md:border-t">
            <div className="font-display text-[34px] font-bold leading-none tracking-[-0.03em] text-leaf-deep">{avgLcv ?? '—'}</div>
            <div className="text-[12.5px] text-text-soft mt-[10px]">Average LCV score</div>
          </div>
          <div className="flex-1 min-w-[150px] p-[22px_24px] border-l border-hair max-md:min-w-[50%] max-md:border-t">
            <div className="font-display text-[34px] font-bold leading-none tracking-[-0.03em] text-leaf-deep">{pledgedCount}</div>
            <div className="text-[12.5px] text-text-soft mt-[10px]">Signed the pledge</div>
          </div>
        </div>

        {/* Tiers */}
        {liveTiers.map(tier => (
          <div key={tier.key} className="mt-[52px]">
            <div className="flex items-baseline gap-[14px] mb-[22px]">
              <h3 className="font-display text-[22px] font-bold tracking-[-0.02em]">{tier.key}</h3>
              <span className="text-[13px] text-text-mute">{tier.note}</span>
              {tier.status !== 'live' && <span className="chip soon">Coming soon</span>}
              <div className="h-[1px] bg-hair flex-1 self-center" />
            </div>
            
            {tier.status === 'live' && tier.officials.length > 0 ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(330px,1fr))] gap-[18px]">
                {tier.officials.map(official => (
                  <PoliticianCard key={official.id} card={official} maxFossil={maxFossil} />
                ))}
              </div>
            ) : tier.status === 'pending' ? (
              <TierPending tier={tier} />
            ) : tier.status === 'live' && tier.officials.length === 0 ? (
              <p className="text-text-soft italic">No officials found for this tier.</p>
            ) : null}
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="border-t border-hair px-[clamp(20px,5vw,72px)] py-[34px] max-w-[1120px] mx-auto flex flex-wrap gap-[18px] justify-between items-center">
        <p className="text-[13px] text-text-mute leading-[1.65] max-w-[700px]">
          <b className="text-crude-deep font-semibold">Demonstration mockup.</b> All names, figures, scores, votes, holdings, and infrastructure shown are illustrative sample data for this prototype. Production figures would come from the sources in the Data sources panel.
        </p>
        <span className="text-[11px] font-semibold tracking-[0.1em] uppercase text-text-soft border border-hair px-[13px] py-[6px] rounded-[20px] whitespace-nowrap">v0.2 prototype</span>
      </footer>
    </>
  )
}
