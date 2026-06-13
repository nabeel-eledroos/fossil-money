'use client'

import { useEffect, useState, use, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { PoliticianProfile } from '@/lib/database.types'

function formatMoney(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US')
}

function formatShort(n: number): string {
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return '$' + Math.round(n / 1e3) + 'K'
  return '$' + n
}

const SECTORS: Record<string, { label: string; color: string }> = {
  oil_gas: { label: 'Oil & gas', color: 'var(--color-crude)' },
  coal: { label: 'Coal', color: 'var(--color-coal)' },
  utilities: { label: 'Electric utilities', color: 'var(--color-util)' },
  mining: { label: 'Mining', color: 'var(--color-mining)' }
}

function LcvGauge({ score, hist }: { score: number; hist: { y: string; s: number }[] }) {
  const r = 60
  const c = 2 * Math.PI * r
  const off = c * (1 - score / 100)
  const col = score >= 50 ? '#3f9d52' : '#c85a26'
  const verdict = score >= 70 ? 'a strong environmental voting record.' : score >= 40 ? 'a mixed environmental voting record.' : 'a weak environmental voting record.'

  return (
    <div className="flex gap-[28px] items-center flex-wrap">
      <div className="w-[140px] h-[140px] flex-none relative">
        <svg viewBox="0 0 140 140" width="140" height="140">
          <circle cx="70" cy="70" r={r} fill="none" stroke="#eceae4" strokeWidth="9" />
          <circle 
            cx="70" cy="70" r={r} fill="none" stroke={col} strokeWidth="9" strokeLinecap="round" 
            strokeDasharray={c} strokeDashoffset={off} transform="rotate(-90 70 70)"
            style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <b className="font-display font-bold text-[38px] text-ink leading-none tracking-[-0.03em]">{score}</b>
          <span className="text-[10px] font-semibold tracking-[0.1em] uppercase text-text-mute mt-[5px]">LCV / 100</span>
        </div>
      </div>
      <div className="flex-1 min-w-[200px]">
        <p className="text-[15px] text-text-soft leading-[1.55]">This official holds <b className="text-ink font-semibold">{verdict}</b> Annual LCV scores below.</p>
        <div className="flex gap-[8px] mt-[18px] items-end h-[64px]">
          {hist.map(h => (
            <div key={h.y} className="flex-1 flex flex-col items-center gap-[6px] justify-end h-full">
              <i className="w-full max-w-[22px] bg-leaf rounded-t-[3px]" style={{ height: `${h.s}%`, minHeight: '2px' }} />
              <small className="text-[10px] text-text-mute">'{h.y.slice(2)}</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function LocalScoreBlock({ score }: { score: string }) {
  const good = ['A', 'B', 'B−'].includes(score)
  return (
    <div className="flex gap-[28px] items-center flex-wrap">
      <div className="font-display font-bold text-[56px] leading-none tracking-[-0.04em]" style={{ color: good ? 'var(--color-leaf-deep)' : 'var(--color-crude-deep)' }}>
        {score}
      </div>
      <div className="flex-1 min-w-[200px]">
        <p className="text-[15px] text-text-soft leading-[1.55]">Local officials don't receive an LCV score, so we grade them on their <b className="text-ink font-semibold">council and commission votes</b>. See the votes below.</p>
      </div>
    </div>
  )
}

export default function PoliticianPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [profile, setProfile] = useState<PoliticianProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const barChartRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)

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

  useEffect(() => {
    if (profile && barChartRef.current) {
      setTimeout(() => {
        barChartRef.current?.querySelectorAll('.bar').forEach((b: any) => {
          b.style.height = b.dataset.h + '%'
        })
      }, 60)
    }
  }, [profile])

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
  const recLabel = p.lcv !== null ? p.lcv : (p.localScore || '—')

  const maxYear = Math.max(...p.yearly.map(d => d.v), 1)
  const subTot = Object.values(p.subIndustry).reduce((a, b) => a + b, 0)
  const dsTot = p.donorSplit.pac + p.donorSplit.individual
  const pacPct = dsTot ? Math.round(p.donorSplit.pac / dsTot * 100) : 0
  const maxDonor = p.donors.length ? Math.max(...p.donors.map(d => d.amt)) : 1

  const emailBody = `Dear ${p.office} ${p.name},

I'm a constituent writing to ask you to stop accepting campaign contributions from fossil-fuel companies and their affiliated PACs.

Public records indicate your campaigns have accepted about ${formatMoney(p.fossilDirect)} from oil, gas, coal, and utility interests — roughly ${p.fossilPct}% of your total funding${p.outsideFossil > 0 ? `, with another ${formatMoney(p.outsideFossil)} in outside spending on your behalf` : ''}${p.lcv !== null ? `, and your lifetime LCV score is ${p.lcv} out of 100` : ''}. As your constituent, I find this concerning given the urgency of the climate crisis.

I am asking you to publicly pledge to refuse further fossil-fuel money and to prioritize the long-term health of our communities.

I will be paying close attention to your decisions on energy and climate.

Sincerely,
[Your name]
[Your address]`

  const copyEmail = () => {
    navigator.clipboard?.writeText(emailBody).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  const mailtoHref = `mailto:${id}@office.gov?subject=${encodeURIComponent('Stop accepting fossil-fuel contributions')}&body=${encodeURIComponent(emailBody)}`

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
      </header>

      <section className="max-w-[1000px] mx-auto px-[clamp(20px,5vw,72px)] py-[clamp(26px,4vw,52px)] pb-[110px]">
        {/* Back */}
        <div onClick={() => window.history.back()} className="text-[14px] font-medium text-text-soft cursor-pointer inline-flex gap-[8px] items-center mb-[20px] hover:text-ink transition-colors">
          ← Back to your representatives
        </div>

        {/* Header */}
        <div className="flex gap-[26px] flex-wrap items-center pb-[30px] border-b border-hair">
          <div className="w-[88px] h-[88px] rounded-full flex-none bg-surface border border-hair-strong flex items-center justify-center font-display font-semibold text-[30px] text-text-soft overflow-hidden">
            {p.photoUrl ? (
              <Image 
                src={p.photoUrl} 
                alt={p.name}
                width={88}
                height={88}
                className="object-cover w-full h-full"
              />
            ) : (
              p.initials
            )}
          </div>
          <div className="flex-1 min-w-[260px]">
            <span className="label block mb-[12px]">{p.level} · {p.party === 'NP' ? 'Nonpartisan' : p.party === 'D' ? 'Democrat' : 'Republican'}{p.state && p.party !== 'NP' ? ` · ${p.state}` : ''}</span>
            <h1 className="font-display text-[clamp(34px,5.5vw,58px)] font-bold tracking-[-0.035em]">{p.name}</h1>
            <div className="text-[18px] text-text-soft mt-[10px]">{p.office}</div>
            <div className="flex gap-[7px] mt-[16px] flex-wrap">
              {p.committee && <span className="chip lever">{p.committee}</span>}
              {p.upThisCycle && <span className="chip pledge-broke">On the ballot {p.next}</span>}
            </div>
          </div>
        </div>

        {/* Pledge Line */}
        <div className={`mt-[22px] flex gap-[10px] items-start text-[15px] p-[13px_16px] rounded-[9px] ${
          p.pledge === 'signed' ? 'bg-leaf-soft text-leaf-deep' :
          p.pledge === 'broke' ? 'bg-alarm-soft text-alarm' :
          'bg-bg text-text-soft border border-hair'
        }`}>
          {p.pledge === 'signed' ? '✓' : p.pledge === 'broke' ? '⚠' : '○'}&nbsp;
          <span>
            {p.pledge === 'signed' ? <><b className="font-bold">Signed the No Fossil Fuel Money pledge</b> and has kept it.</> :
             p.pledge === 'broke' ? <><b className="font-bold">Signed the pledge — then took fossil-fuel money.</b> May be removed from the signer list.</> :
             <>Has <b className="font-bold">not</b> signed the No Fossil Fuel Money pledge.</>}
          </span>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(165px,1fr))] border border-hair rounded-[14px] overflow-hidden mt-[34px]">
          <div className="p-[22px] relative border-t border-l border-hair first:border-t-0 first:border-l-0 [&:nth-child(-n+5)]:border-t-0">
            <div className="text-[11px] font-semibold tracking-[0.08em] uppercase text-text-mute">Direct fossil $</div>
            <div className="font-display font-bold text-[34px] leading-none mt-[14px] tracking-[-0.03em] text-crude-deep">{formatShort(p.fossilDirect)}</div>
            <div className="text-[12.5px] text-text-soft mt-[8px] leading-[1.4]">{formatMoney(p.fossilDirect)} lifetime</div>
            {isFlagged && (
              <div className="inline-flex items-center gap-[6px] text-[11px] font-semibold text-alarm mt-[14px]">
                <span className="w-[6px] h-[6px] rounded-full bg-alarm inline-block" />
                Flagged
              </div>
            )}
          </div>
          <div className="p-[22px] border-t border-l border-hair [&:nth-child(-n+5)]:border-t-0">
            <div className="text-[11px] font-semibold tracking-[0.08em] uppercase text-text-mute">Share of funding</div>
            <div className="font-display font-bold text-[34px] leading-none mt-[14px] tracking-[-0.03em] text-crude-deep">{p.fossilPct}%</div>
            <div className="text-[12.5px] text-text-soft mt-[8px] leading-[1.4]">of {formatShort(p.totalRaised)} raised</div>
          </div>
          <div className="p-[22px] border-t border-l border-hair [&:nth-child(-n+5)]:border-t-0">
            <div className="text-[11px] font-semibold tracking-[0.08em] uppercase text-text-mute">Outside money</div>
            <div className="font-display font-bold text-[34px] leading-none mt-[14px] tracking-[-0.03em] text-dark">{formatShort(p.outsideFossil)}</div>
            <div className="text-[12.5px] text-text-soft mt-[8px] leading-[1.4]">IE / dark money</div>
          </div>
          <div className="p-[22px] border-t border-l border-hair [&:nth-child(-n+5)]:border-t-0">
            <div className="text-[11px] font-semibold tracking-[0.08em] uppercase text-text-mute">Clean energy $</div>
            <div className="font-display font-bold text-[34px] leading-none mt-[14px] tracking-[-0.03em] text-leaf-deep">{formatShort(p.cleanEnergy)}</div>
            <div className="text-[12.5px] text-text-soft mt-[8px] leading-[1.4]">for contrast</div>
          </div>
          <div className="p-[22px] border-t border-l border-hair [&:nth-child(-n+5)]:border-t-0">
            <div className="text-[11px] font-semibold tracking-[0.08em] uppercase text-text-mute">{p.lcv !== null ? 'LCV score' : 'Local grade'}</div>
            <div className="font-display font-bold text-[34px] leading-none mt-[14px] tracking-[-0.03em] text-leaf-deep">
              {recLabel}{p.lcv !== null && <small className="text-[16px] text-text-mute font-medium"> /100</small>}
            </div>
            <div className="text-[12.5px] text-text-soft mt-[8px] leading-[1.4]">{p.lcv !== null ? 'lifetime' : 'council votes'}</div>
          </div>
        </div>

        {/* Money Over Time Panel */}
        <div className="bg-surface border border-hair rounded-[14px] p-[clamp(20px,3vw,32px)] mt-[18px]">
          <h3 className="font-display text-[21px] font-bold tracking-[-0.02em] mb-[5px]">Fossil-fuel contributions over time</h3>
          <div className="text-[14px] text-text-soft mb-[24px]">Direct contributions by year</div>
          <div ref={barChartRef} className="barchart">
            {p.yearly.map(d => (
              <div key={d.y} className="bcol">
                <div className="bar" data-h={Math.max(2, Math.round(d.v / maxYear * 100))} style={{ height: 0 }}>
                  <span className="amt">{d.v ? formatShort(d.v) : '$0'}</span>
                </div>
                <div className="yr">'{d.y.slice(2)}</div>
              </div>
            ))}
          </div>
          <div className="text-[12px] text-text-mute mt-[18px] pt-[14px] border-t border-hair">
            Source: {p.sources.money} · synced {p.sources.moneySynced}
          </div>
        </div>

        {/* Industry + Donors Grid */}
        <div className="grid grid-cols-2 gap-[18px] mt-[18px] max-lg:grid-cols-1">
          {/* Industry Breakdown */}
          <div className="bg-surface border border-hair rounded-[14px] p-[clamp(20px,3vw,32px)]">
            <h3 className="font-display text-[21px] font-bold tracking-[-0.02em] mb-[5px]">Breakdown by industry</h3>
            <div className="text-[14px] text-text-soft mb-[24px]">Which fossil sectors the money comes from</div>
            
            {subTot > 0 ? (
              <>
                <div className="segbar">
                  {Object.entries(p.subIndustry).filter(([, v]) => v > 0).map(([k, v]) => (
                    <i key={k} style={{ width: `${v / subTot * 100}%`, background: SECTORS[k]?.color }} />
                  ))}
                </div>
                <div className="flex flex-wrap gap-[11px_20px] mt-[18px]">
                  {Object.entries(p.subIndustry).filter(([, v]) => v > 0).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-[8px] text-[13.5px] text-text-soft">
                      <span className="w-[10px] h-[10px] rounded-[3px] flex-none" style={{ background: SECTORS[k]?.color }} />
                      {SECTORS[k]?.label} <b className="text-ink font-semibold num">{formatShort(v)}</b>
                    </div>
                  ))}
                </div>
                <div className="mt-[26px]">
                  <div className="flex justify-between text-[13px] text-text-soft mb-[8px]">
                    <span>PAC money <b className="text-ink font-semibold">{formatMoney(p.donorSplit.pac)}</b></span>
                    <span>Individuals <b className="text-ink font-semibold">{formatMoney(p.donorSplit.individual)}</b></span>
                  </div>
                  <div className="segbar">
                    <i style={{ width: `${pacPct}%`, background: 'var(--color-crude-deep)' }} />
                    <i style={{ width: `${100 - pacPct}%`, background: 'var(--color-mining)' }} />
                  </div>
                </div>
              </>
            ) : (
              <p className="text-text-soft italic text-[15px] leading-[1.5]">No fossil-fuel money to break down.</p>
            )}
          </div>

          {/* Donors */}
          <div className="bg-surface border border-hair rounded-[14px] p-[clamp(20px,3vw,32px)]">
            <h3 className="font-display text-[21px] font-bold tracking-[-0.02em] mb-[5px]">Who's writing the checks</h3>
            <div className="text-[14px] text-text-soft mb-[24px]">Largest fossil-fuel contributors</div>
            
            {p.donors.length > 0 ? (
              p.donors.map((d, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto] gap-[6px_14px] items-center py-[14px] border-b border-hair last:border-b-0">
                  <div className="font-semibold text-[15.5px] text-ink">
                    {d.n}
                    <small className="block font-normal text-text-mute text-[11.5px] mt-[2px] tracking-[0.02em]">
                      {SECTORS[d.sector]?.label || d.sector} · {d.type}
                    </small>
                  </div>
                  <div className="font-bold text-[15.5px] text-crude-deep text-right num">{formatMoney(d.amt)}</div>
                  <div className="col-span-2 h-[4px] bg-hair rounded-[3px] overflow-hidden">
                    <i className="block h-full rounded-[3px]" style={{ width: `${Math.round(d.amt / maxDonor * 100)}%`, background: SECTORS[d.sector]?.color }} />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-text-soft italic text-[15px] leading-[1.5]">No fossil-fuel contributions on record. This official has pledged to refuse them.</p>
            )}
          </div>
        </div>

        {/* Outside Money Panel */}
        {p.outsideFossil > 0 && (
          <div className="bg-surface border border-hair rounded-[14px] p-[clamp(20px,3vw,32px)] mt-[18px]">
            <h3 className="font-display text-[21px] font-bold tracking-[-0.02em] mb-[5px]">Outside & dark money</h3>
            <div className="text-[14px] text-text-soft mb-[24px]">Independent expenditures from fossil-fuel interests — money spent supporting them that doesn't count toward direct contributions</div>
            <div className="font-display font-bold text-[38px] tracking-[-0.03em] text-dark">{formatMoney(p.outsideFossil)}</div>
            <p className="text-text-soft text-[14.5px] mt-[8px] max-w-[620px]">
              Spent by fossil-aligned super PACs and 501(c)(4) "dark money" groups. That's {p.fossilDirect > 0 ? `${(p.outsideFossil / p.fossilDirect).toFixed(1)}× their direct contributions` : 'on top of direct contributions'}.
            </p>
            <div className="text-[12px] text-text-mute mt-[18px] pt-[14px] border-t border-hair">
              Source: independent-expenditure filings · <a href="#" className="text-crude-deep font-semibold">FEC ↗</a>
            </div>
          </div>
        )}

        {/* Environmental Record Panel */}
        <div className="bg-surface border border-hair rounded-[14px] p-[clamp(20px,3vw,32px)] mt-[18px]">
          <h3 className="font-display text-[21px] font-bold tracking-[-0.02em] mb-[5px]">{p.lcv !== null ? 'Environmental record' : 'Local environmental record'}</h3>
          <div className="text-[14px] text-text-soft mb-[24px]">{p.lcv !== null ? 'LCV lifetime score and trend' : 'Grade from council & commission votes'}</div>
          {p.lcv !== null ? <LcvGauge score={p.lcv} hist={p.lcvHist} /> : <LocalScoreBlock score={p.localScore || '—'} />}
        </div>

        {/* Votes Panel */}
        {p.votes.length > 0 && (
          <div className="bg-surface border border-hair rounded-[14px] p-[clamp(20px,3vw,32px)] mt-[18px]">
            <h3 className="font-display text-[21px] font-bold tracking-[-0.02em] mb-[5px]">The votes behind the score</h3>
            <div className="text-[14px] text-text-soft mb-[24px]">Key climate & energy decisions LCV scored</div>
            <ul className="list-none">
              {p.votes.map((v, i) => (
                <li key={i} className="flex gap-[13px] py-[15px] border-b border-hair items-start last:border-b-0">
                  <span className={`text-[10.5px] font-semibold px-[9px] py-[4px] rounded-[20px] whitespace-nowrap flex-none ${v.m === 'bad' ? 'bg-crude-soft text-crude-deep' : 'bg-leaf-soft text-leaf-deep'}`}>
                    {v.m === 'bad' ? 'Anti' : 'Pro'}
                  </span>
                  <div>
                    <b className="text-ink font-semibold text-[15.5px]">{v.t}</b>
                    <small className="block text-[12.5px] text-text-mute mt-[3px]">
                      {v.d} · {v.bill} · <a href="#" className="text-crude-deep font-semibold">view bill ↗</a>
                    </small>
                  </div>
                </li>
              ))}
            </ul>
            <div className="text-[12px] text-text-mute mt-[18px] pt-[14px] border-t border-hair">
              Source: {p.lcv !== null ? 'LCV Scorecard & Congress.gov' : 'council/commission records'} · <a href="#" className="text-crude-deep font-semibold">view votes ↗</a>
            </div>
          </div>
        )}

        {/* Lobbying + Holdings Grid */}
        {(p.lobbying || p.holdings.length > 0) && (
          <div className="grid grid-cols-2 gap-[18px] mt-[18px] max-lg:grid-cols-1">
            {p.lobbying && (
              <div className="bg-surface border border-hair rounded-[14px] p-[clamp(20px,3vw,32px)]">
                <h3 className="font-display text-[21px] font-bold tracking-[-0.02em] mb-[5px]">Fossil lobbying around them</h3>
                <div className="text-[14px] text-text-soft mb-[24px]">What fossil-fuel interests {p.lobbying.note}</div>
                <div className="flex justify-between gap-[14px] py-[13px] border-b border-hair items-baseline">
                  <div className="text-[15px] text-ink font-medium">Total fossil lobbying, 2024</div>
                  <div className="font-display font-bold text-[17px] text-ink whitespace-nowrap num">{formatMoney(p.lobbying.annual)}</div>
                </div>
                {p.lobbying.firms.map((f, i) => (
                  <div key={i} className="flex justify-between gap-[14px] py-[13px] border-b border-hair items-baseline last:border-b-0">
                    <div className="text-[15px] text-ink font-medium">{f.n}</div>
                    <div className="font-display font-bold text-[17px] text-ink whitespace-nowrap num">{formatMoney(f.amt)}</div>
                  </div>
                ))}
                <div className="text-[12px] text-text-mute mt-[18px] pt-[14px] border-t border-hair">
                  Source: Senate & House LDA filings · <a href="#" className="text-crude-deep font-semibold">disclosures ↗</a>
                </div>
              </div>
            )}
            {p.holdings.length > 0 && (
              <div className="bg-surface border border-hair rounded-[14px] p-[clamp(20px,3vw,32px)]">
                <h3 className="font-display text-[21px] font-bold tracking-[-0.02em] mb-[5px]">Personal fossil-fuel holdings</h3>
                <div className="text-[14px] text-text-soft mb-[24px]">Investments in fossil-fuel companies reported on their own financial disclosure</div>
                {p.holdings.map((h, i) => (
                  <div key={i} className="flex justify-between gap-[14px] py-[13px] border-b border-hair items-baseline last:border-b-0">
                    <div className="text-[15px] text-ink font-medium">{h.co}</div>
                    <div className="font-display font-bold text-[17px] text-ink whitespace-nowrap num">{h.range}</div>
                  </div>
                ))}
                <div className="text-[12px] text-text-mute mt-[18px] pt-[14px] border-t border-hair">
                  Source: personal financial disclosure · <a href="#" className="text-crude-deep font-semibold">filing ↗</a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* District Stakes Panel */}
        {p.stakes.length > 0 && (
          <div className="bg-surface border border-hair rounded-[14px] p-[clamp(20px,3vw,32px)] mt-[18px]">
            <h3 className="font-display text-[21px] font-bold tracking-[-0.02em] mb-[5px]">What's at stake in their district</h3>
            <div className="text-[14px] text-text-soft mb-[24px]">The fossil-fuel footprint they have direct influence over</div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-[14px]">
              {p.stakes.map((s, i) => (
                <div key={i} className="border border-hair rounded-[9px] p-[16px]">
                  <div className="font-display font-bold text-[26px] tracking-[-0.02em] text-coal">{s.sv}</div>
                  <div className="text-[13px] text-text-soft mt-[6px] leading-[1.4]">{s.sl}</div>
                </div>
              ))}
            </div>
            <div className="text-[12px] text-text-mute mt-[18px] pt-[14px] border-t border-hair">
              Source: EPA FLIGHT/GHGRP & EIA · <a href="#" className="text-crude-deep font-semibold">data ↗</a>
            </div>
          </div>
        )}

        {/* Election Panel */}
        <div className="bg-surface border border-hair rounded-[14px] p-[clamp(20px,3vw,32px)] mt-[18px]">
          <h3 className="font-display text-[21px] font-bold tracking-[-0.02em] mb-[5px]">Your move</h3>
          <div className="text-[14px] text-text-soft mb-[24px]">When you can weigh in at the ballot box</div>
          <div className="flex flex-wrap gap-0 border border-hair rounded-[9px] overflow-hidden mb-[18px]">
            <div className="flex-1 min-w-[130px] p-[16px_18px] border-l border-hair first:border-l-0">
              <div className={`font-display font-bold text-[19px] text-ink tracking-[-0.01em] ${p.upThisCycle ? 'text-leaf-deep' : ''}`}>
                {p.upThisCycle ? 'On the ballot' : 'Not up yet'}
              </div>
              <div className="text-[12px] text-text-mute mt-[5px]">this cycle</div>
            </div>
            <div className="flex-1 min-w-[130px] p-[16px_18px] border-l border-hair">
              <div className="font-display font-bold text-[19px] text-ink tracking-[-0.01em]">{p.next}</div>
              <div className="text-[12px] text-text-mute mt-[5px]">next election</div>
            </div>
            <div className="flex-1 min-w-[130px] p-[16px_18px] border-l border-hair">
              <div className="font-display font-bold text-[19px] text-ink tracking-[-0.01em]">{p.lastMargin}</div>
              <div className="text-[12px] text-text-mute mt-[5px]">last margin</div>
            </div>
            <div className="flex-1 min-w-[130px] p-[16px_18px] border-l border-hair">
              <div className="font-display font-bold text-[19px] text-ink tracking-[-0.01em]">{p.since}</div>
              <div className="text-[12px] text-text-mute mt-[5px]">in office since</div>
            </div>
          </div>
          <p className="text-[14.5px] text-text-soft mb-[10px]">
            {p.upThisCycle ? "This seat is up this cycle — your vote is the most direct lever you have." : "Not on the ballot this cycle, but public pressure between elections still moves votes."}
          </p>
          <a href="https://vote.gov" target="_blank" rel="noopener" className="font-body font-semibold text-[14px] px-[22px] py-[13px] rounded-[9px] border border-hair-strong bg-transparent text-ink cursor-pointer inline-flex items-center gap-[9px] hover:border-ink transition-[border-color]">
            Check your registration ↗
          </a>
        </div>

        {/* Email Composer */}
        <div className="bg-surface border border-hair rounded-[14px] p-[clamp(22px,3.5vw,38px)] mt-[30px]">
          <span className="label text-crude-deep">Take action</span>
          <h3 className="font-display text-[clamp(23px,3.4vw,32px)] font-bold tracking-[-0.025em] my-[11px_9px]">Tell {p.name.split(' ').slice(-1)} to drop the fossil money</h3>
          <p className="text-text-soft text-[15.5px] max-w-[600px] leading-[1.55]">We've drafted a letter using their real numbers. Edit anything, then send it or copy it.</p>
          
          <div className="mt-[26px] flex flex-col gap-[15px]">
            <div className="flex gap-[15px] flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-text-soft block mb-[8px]">To</label>
                <input defaultValue={`${id}@office.gov`} className="w-full bg-bg border border-hair-strong rounded-[9px] px-[15px] py-[13px] font-body text-[15px] text-ink outline-none transition-[border-color] focus:border-ink" />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-text-soft block mb-[8px]">From (your email)</label>
                <input placeholder="you@email.com" className="w-full bg-bg border border-hair-strong rounded-[9px] px-[15px] py-[13px] font-body text-[15px] text-ink outline-none transition-[border-color] focus:border-ink" />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-text-soft block mb-[8px]">Subject</label>
              <input defaultValue="Stop accepting fossil-fuel contributions" className="w-full bg-bg border border-hair-strong rounded-[9px] px-[15px] py-[13px] font-body text-[15px] text-ink outline-none transition-[border-color] focus:border-ink" />
            </div>
            <div>
              <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-text-soft block mb-[8px]">Message</label>
              <textarea defaultValue={emailBody} className="w-full bg-bg border border-hair-strong rounded-[9px] px-[15px] py-[13px] font-body text-[15px] text-ink outline-none transition-[border-color] resize-y leading-[1.6] min-h-[250px] focus:border-ink" />
            </div>
          </div>
          
          <div className="flex gap-[12px] flex-wrap mt-[20px] items-center">
            <a href={mailtoHref} className="font-body font-semibold text-[14px] px-[22px] py-[13px] rounded-[9px] bg-ink text-white cursor-pointer inline-flex items-center gap-[9px] transition-[transform,opacity] hover:-translate-y-[2px] hover:opacity-90">
              ✉ Open in email app
            </a>
            <button onClick={copyEmail} className="font-body font-semibold text-[14px] px-[22px] py-[13px] rounded-[9px] border border-hair-strong bg-transparent text-ink cursor-pointer transition-[border-color] hover:border-ink">
              Copy message
            </button>
            <span className={`text-[13px] font-semibold text-leaf-deep transition-opacity duration-300 ${copied ? 'opacity-100' : 'opacity-0'}`}>Copied ✓</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-hair px-[clamp(20px,5vw,72px)] py-[34px] max-w-[1000px] mx-auto flex flex-wrap gap-[18px] justify-between items-center">
        <p className="text-[13px] text-text-mute leading-[1.65] max-w-[700px]">
          <b className="text-crude-deep font-semibold">Demonstration mockup.</b> Figures are illustrative sample data, not real records.
        </p>
        <span className="text-[11px] font-semibold tracking-[0.1em] uppercase text-text-soft border border-hair px-[13px] py-[6px] rounded-[20px] whitespace-nowrap">v0.2 prototype</span>
      </footer>
    </>
  )
}
