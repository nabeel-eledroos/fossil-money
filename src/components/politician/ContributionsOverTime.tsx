'use client'

import { useEffect, useRef } from 'react'
import type { YearlyDonation } from '@/lib/database.types'
import { formatShort } from './utils'

interface Props {
  yearly: YearlyDonation[]
  sources: { money: string; moneySynced: string }
}

export function ContributionsOverTime({ yearly, sources }: Props) {
  const barChartRef = useRef<HTMLDivElement>(null)
  const maxYear = Math.max(...yearly.map(d => d.v), 1)

  useEffect(() => {
    if (barChartRef.current) {
      setTimeout(() => {
        barChartRef.current?.querySelectorAll('.bar').forEach((b) => {
          const bar = b as HTMLElement
          bar.style.height = bar.dataset.h + '%'
        })
      }, 60)
    }
  }, [yearly])

  return (
    <div className="bg-surface border border-hair rounded-[14px] p-[clamp(20px,3vw,32px)] mt-[18px]">
      <h3 className="font-display text-[21px] font-bold tracking-[-0.02em] mb-[5px]">Fossil-fuel contributions over time</h3>
      <div className="text-[14px] text-text-soft mb-[24px]">Direct contributions by year</div>
      <div ref={barChartRef} className="barchart">
        {yearly.map(d => (
          <div key={d.y} className="bcol">
            <div className="bar" data-h={Math.max(2, Math.round(d.v / maxYear * 100))} style={{ height: 0 }}>
              <span className="amt">{d.v ? formatShort(d.v) : '$0'}</span>
            </div>
            <div className="yr">{d.y}</div>
          </div>
        ))}
      </div>
      <div className="text-[12px] text-text-mute mt-[18px] pt-[14px] border-t border-hair">
        Source: {sources.money} · synced {sources.moneySynced}
      </div>
    </div>
  )
}
