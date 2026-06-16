'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { NationalStats } from '@/lib/database.types'

function formatMoney(n: number): string {
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return '$' + Math.round(n / 1e3) + 'K'
  return '$' + n
}

export default function Home() {
  const router = useRouter()
  const [zip, setZip] = useState('')
  const [zipError, setZipError] = useState(false)
  const [stats, setStats] = useState<NationalStats | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    fetch('/api/stats/national')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(console.error)
  }, [])

  const lookup = () => {
    const z = zip.trim()
    if (!/^\d{5}$/.test(z)) {
      setZipError(true)
      setTimeout(() => setZipError(false), 700)
      return
    }
    router.push(`/results/${z}`)
  }

  // const trySample = () => {
  //   setZip('94110')
  //   router.push('/results/94110')
  // }

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
          <a onClick={() => setDrawerOpen(true)} className="text-[14px] font-medium text-text-soft cursor-pointer hover:text-ink transition-colors">Data sources</a>
          <a href="#method" className="text-[14px] font-medium text-text-soft cursor-pointer hover:text-ink transition-colors">Methodology</a>
        </nav>
      </header>

      {/* Data Sources Drawer */}
      {drawerOpen && (
        <div 
          className="fixed inset-0 bg-[rgba(23,22,15,0.42)] backdrop-blur-[3px] z-[90] flex items-start justify-center p-[64px_20px] overflow-auto"
          onClick={(e) => e.target === e.currentTarget && setDrawerOpen(false)}
        >
          <div className="bg-surface border border-hair rounded-[14px] max-w-[660px] w-full p-[clamp(24px,4vw,38px)] shadow-[0_30px_80px_-28px_rgba(0,0,0,0.5)] relative">
            <span onClick={() => setDrawerOpen(false)} className="absolute top-[20px] right-[22px] cursor-pointer text-text-mute text-[18px] hover:text-ink">✕</span>
            <h3 className="font-display text-[23px] font-bold tracking-[-0.02em] mb-[6px]">Where every number comes from</h3>
            <p className="text-text-soft text-[14.5px] leading-[1.5] mb-[22px]">A nightly ETL pulls each source into a Postgres store, classifies fossil-fuel dollars, and precomputes per-official summaries — so the app reads instantly.</p>
            
            <div className="py-[14px] border-b border-hair">
              <h6 className="font-body text-[14.5px] font-bold text-ink mb-[3px]">Who represents you <span className="font-medium text-crude-deep text-[12.5px]">Census Geocoder · congress-legislators · Open States · Cicero</span></h6>
              <p className="text-[13.5px] text-text-soft leading-[1.45]">Address → districts via the free Census Geocoder, joined to officials: <b className="text-crude-deep">federal (congress-legislators) and state (Open States) are live</b>; local is enabled per region via Cicero or curated records.</p>
            </div>
            <div className="py-[14px] border-b border-hair">
              <h6 className="font-body text-[14.5px] font-bold text-ink mb-[3px]">Federal money &amp; votes <span className="font-medium text-crude-deep text-[12.5px]">FEC via WhoBoughtMyRep</span></h6>
              <p className="text-[13.5px] text-text-soft leading-[1.45]">FEC + Congress.gov data with industry attribution traced through PAC hops, plus outside (independent-expenditure) spending and voting records.</p>
            </div>
            <div className="py-[14px] border-b border-hair">
              <h6 className="font-body text-[14.5px] font-bold text-ink mb-[3px]">State &amp; local money <span className="font-medium text-crude-deep text-[12.5px]">FollowTheMoney · state disclosure portals</span></h6>
              <p className="text-[13.5px] text-text-soft leading-[1.45]">State legislative and local campaign-finance filings.</p>
            </div>
            <div className="py-[14px] border-b border-hair">
              <h6 className="font-body text-[14.5px] font-bold text-ink mb-[3px]">Environmental record <span className="font-medium text-crude-deep text-[12.5px]">LCV National &amp; State Scorecards · Congress.gov</span></h6>
              <p className="text-[13.5px] text-text-soft leading-[1.45]">Lifetime and per-session scores, plus the specific scored votes behind them. Local officials get a record built from council votes.</p>
            </div>
            <div className="py-[14px] border-b border-hair">
              <h6 className="font-body text-[14.5px] font-bold text-ink mb-[3px]">Lobbying <span className="font-medium text-crude-deep text-[12.5px]">Senate / House LDA filings</span></h6>
              <p className="text-[13.5px] text-text-soft leading-[1.45]">What fossil-fuel interests spend lobbying the committees an official sits on.</p>
            </div>
            <div className="py-[14px] border-b border-hair">
              <h6 className="font-body text-[14.5px] font-bold text-ink mb-[3px]">Personal holdings <span className="font-medium text-crude-deep text-[12.5px]">House &amp; Senate financial disclosures</span></h6>
              <p className="text-[13.5px] text-text-soft leading-[1.45]">An official's own reported investments in fossil-fuel companies.</p>
            </div>
            <div className="py-[14px] border-b border-hair">
              <h6 className="font-body text-[14.5px] font-bold text-ink mb-[3px]">District stakes <span className="font-medium text-crude-deep text-[12.5px]">EPA FLIGHT/GHGRP · EIA</span></h6>
              <p className="text-[13.5px] text-text-soft leading-[1.45]">The fossil-fuel infrastructure and emissions physically located in their district.</p>
            </div>
            <div className="py-[14px]">
              <h6 className="font-body text-[14.5px] font-bold text-ink mb-[3px]">The pledge <span className="font-medium text-crude-deep text-[12.5px]">No Fossil Fuel Money coalition</span></h6>
              <p className="text-[13.5px] text-text-soft leading-[1.45]">Whether an official signed the pledge to refuse fossil-fuel contributions — and whether they've kept it.</p>
            </div>
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="max-w-[1080px] mx-auto px-[clamp(20px,5vw,72px)] pt-[clamp(52px,10vw,128px)] pb-[72px]">
        <div className="mb-[28px] animate-rise inline-flex items-center gap-[9px]" style={{ animationDelay: '0.05s' }}>
          <span className="label flex items-center gap-[9px]">
            <span className="w-[6px] h-[6px] rounded-full bg-crude" />
            Climate accountability for every ballot
          </span>
        </div>
        
        <h1 className="font-display text-[clamp(42px,7.5vw,90px)] font-bold tracking-[-0.035em] leading-[1.04] text-balance animate-rise" style={{ animationDelay: '0.1s' }}>
          Know who <em className="italic font-medium">represents</em> you.<br />And who <u className="no-underline border-b-4 border-crude pb-[2px]">funds</u> them.
        </h1>
        
        <p className="text-[clamp(18px,2.1vw,21px)] max-w-[580px] mt-[28px] text-text-soft leading-[1.55] animate-rise" style={{ animationDelay: '0.2s' }}>
          Enter your ZIP to see the federal and state officials who represent you — the fossil-fuel money behind them, their environmental record, and exactly how to push back. Local officials are rolling out city by city.
        </p>

        {/* Search Box */}
        <div className="mt-[42px] max-w-[540px] animate-rise" style={{ animationDelay: '0.3s' }}>
          <span className="label block mb-[13px]">Enter your ZIP code</span>
          <div className="flex gap-[8px]">
            <input
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && lookup()}
              maxLength={5}
              inputMode="numeric"
              placeholder="94117"
              autoComplete="postal-code"
              className={`flex-1 border bg-surface rounded-[9px] text-[22px] font-semibold tracking-[0.12em] text-ink px-[20px] py-[16px] outline-none w-full transition-[border-color,box-shadow] duration-200 placeholder:text-text-mute placeholder:font-normal ${zipError ? 'border-alarm' : 'border-hair-strong'} focus:border-ink focus:shadow-[0_0_0_4px_rgba(23,22,15,0.06)]`}
            />
            <button 
              onClick={lookup}
              className="border-none cursor-pointer bg-ink text-white font-body font-semibold text-[15px] px-[28px] rounded-[9px] transition-[transform,opacity] duration-150 whitespace-nowrap hover:translate-y-[-1px] hover:opacity-90"
            >
              Reveal&nbsp;→
            </button>
          </div>
          {/* <div className="text-[14px] text-text-mute mt-[14px]">
            Don't have one handy?{' '}
            <b onClick={trySample} className="text-crude-deep cursor-pointer font-semibold border-b border-crude-soft">
              Try a sample district →
            </b>
          </div> */}
        </div>

        {/* National Stats */}
        <span className="label block mt-[64px] mb-[16px]">The national picture · {stats?.asOfLabel || 'illustrative sample data'}</span>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] border border-hair rounded-[14px] overflow-hidden animate-rise" style={{ animationDelay: '0.38s' }}>
          <div className="p-[24px_26px] border-l border-hair first:border-l-0 max-md:border-l-0 max-md:border-t max-md:first:border-t-0">
            <div className="font-display text-[34px] font-bold tracking-[-0.03em] leading-none text-crude-deep">
              {stats ? formatMoney(stats.totalFossil) : '$284M'}
            </div>
            <div className="text-[13px] text-text-soft mt-[9px] leading-[1.4]">in fossil-fuel money to sitting members of Congress, across cycles tracked</div>
          </div>
          <div className="p-[24px_26px] border-l border-hair max-md:border-l-0 max-md:border-t">
            <div className="font-display text-[34px] font-bold tracking-[-0.03em] leading-none text-crude-deep">
              {stats ? `${stats.fossilPctOfTotal.toFixed(1)}%` : '6.4%'}
            </div>
            <div className="text-[13px] text-text-soft mt-[9px] leading-[1.4]">of all the campaign money they've raised comes from fossil-fuel interests</div>
          </div>
          <div className="p-[24px_26px] border-l border-hair max-md:border-l-0 max-md:border-t">
            <div className="font-display text-[34px] font-bold tracking-[-0.03em] leading-none text-leaf-deep">
              {stats ? formatMoney(stats.totalCleanEnergy) : '$71M'}
            </div>
            <div className="text-[13px] text-text-soft mt-[9px] leading-[1.4]">in clean-energy contributions over the same period, for contrast</div>
          </div>
          <div className="p-[24px_26px] border-l border-hair max-md:border-l-0 max-md:border-t">
            <div className="font-display text-[34px] font-bold tracking-[-0.03em] leading-none text-crude-deep">
              {stats?.pledgeSigners ?? 163}
            </div>
            <div className="text-[13px] text-text-soft mt-[9px] leading-[1.4]">members have signed the No Fossil Fuel Money pledge</div>
          </div>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-[26px] mt-[60px] animate-rise" style={{ animationDelay: '0.46s' }}>
          <div className="flex gap-[13px] items-start">
            <div className="w-[9px] h-[9px] rounded-full mt-[8px] flex-none bg-crude" />
            <div>
              <h4 className="text-[16px] font-semibold mb-[3px] font-body tracking-normal text-ink">Direct fossil money</h4>
              <p className="text-[14.5px] text-text-soft leading-[1.5]">Contributions from oil, gas, coal, and utility interests and their PACs.</p>
            </div>
          </div>
          <div className="flex gap-[13px] items-start">
            <div className="w-[9px] h-[9px] rounded-full mt-[8px] flex-none bg-dark" />
            <div>
              <h4 className="text-[16px] font-semibold mb-[3px] font-body tracking-normal text-ink">Outside &amp; dark money</h4>
              <p className="text-[14.5px] text-text-soft leading-[1.5]">Independent expenditures and super-PAC spending supporting them.</p>
            </div>
          </div>
          <div className="flex gap-[13px] items-start">
            <div className="w-[9px] h-[9px] rounded-full mt-[8px] flex-none bg-leaf" />
            <div>
              <h4 className="text-[16px] font-semibold mb-[3px] font-body tracking-normal text-ink">LCV record</h4>
              <p className="text-[14.5px] text-text-soft leading-[1.5]">League of Conservation Voters score, 0–100, and the votes behind it.</p>
            </div>
          </div>
          <div className="flex gap-[13px] items-start">
            <div className="w-[9px] h-[9px] rounded-full mt-[8px] flex-none bg-alarm" />
            <div>
              <h4 className="text-[16px] font-semibold mb-[3px] font-body tracking-normal text-ink">Flagged</h4>
              <p className="text-[14.5px] text-text-soft leading-[1.5]">Heavy fossil funding with a weak record — or a broken pledge.</p>
            </div>
          </div>
        </div>

        {/* Methodology */}
        <div id="method" className="mt-[80px] border-t border-hair pt-[42px] grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-[36px]">
          <div>
            <h5 className="text-[11.5px] font-semibold tracking-[0.14em] uppercase text-crude-deep mb-[10px]">The money</h5>
            <p className="text-[14.5px] text-text-soft leading-[1.5]">Federal from the FEC (via WhoBoughtMyRep), with PAC-hop industry attribution; state &amp; local from FollowTheMoney and state disclosure portals. Each donation is tagged by sub-industry — oil &amp; gas, coal, utilities, mining.</p>
          </div>
          <div>
            <h5 className="text-[11.5px] font-semibold tracking-[0.14em] uppercase text-crude-deep mb-[10px]">Outside &amp; dark money</h5>
            <p className="text-[14.5px] text-text-soft leading-[1.5]">Direct contributions are only part of the picture. Fossil-fuel interests also spend through <b className="text-crude-deep">independent expenditures</b> — ads and mailers run for or against a candidate <em>without</em> coordinating with their campaign — and through <b className="text-crude-deep">501(c)(4) "dark money"</b> groups that never disclose their donors.</p>
          </div>
          <div>
            <h5 className="text-[11.5px] font-semibold tracking-[0.14em] uppercase text-crude-deep mb-[10px]">What the LCV score means</h5>
            <p className="text-[14.5px] text-text-soft leading-[1.5]">The League of Conservation Voters scores every member of Congress from <b className="text-crude-deep">0 to 100</b> on their environmental record — the share of key climate, energy, and conservation votes on which they took the position backed by environmental groups.</p>
          </div>
          <div>
            <h5 className="text-[11.5px] font-semibold tracking-[0.14em] uppercase text-crude-deep mb-[10px]">Finding your reps</h5>
            <p className="text-[14.5px] text-text-soft leading-[1.5]">Federal (congress-legislators) and state (Open States) are live now; local — mayors, council, county — rolls out per region via Cicero or curated records. Address matching uses the free Census Geocoder.</p>
          </div>
          <div>
            <h5 className="text-[11.5px] font-semibold tracking-[0.14em] uppercase text-crude-deep mb-[10px]">Beyond the money</h5>
            <p className="text-[14.5px] text-text-soft leading-[1.5]">We also surface the lobbying fossil interests spend on an official's committees, the fossil-company stock they hold themselves, and the refineries, plants, and wells physically located in their district.</p>
          </div>
          <div>
            <h5 className="text-[11.5px] font-semibold tracking-[0.14em] uppercase text-crude-deep mb-[10px]">How it's built</h5>
            <p className="text-[14.5px] text-text-soft leading-[1.5]">A nightly pipeline precomputes everything into one store. <b onClick={() => setDrawerOpen(true)} className="text-crude-deep cursor-pointer">See all sources →</b></p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-hair px-[clamp(20px,5vw,72px)] py-[34px] max-w-[1120px] mx-auto flex flex-wrap gap-[18px] justify-between items-center">
        <p className="text-[13px] text-text-mute leading-[1.65] max-w-[700px]">
          <b className="text-crude-deep font-semibold">Fossil Money</b> tracks fossil-fuel contributions to elected officials. Data from FEC, LCV, and state filings. Not affiliated with any campaign or party.
        </p>
        <span className="text-[11px] font-semibold tracking-[0.1em] uppercase text-text-soft border border-hair px-[13px] py-[6px] rounded-[20px] whitespace-nowrap">v0.2</span>
      </footer>
    </>
  )
}
