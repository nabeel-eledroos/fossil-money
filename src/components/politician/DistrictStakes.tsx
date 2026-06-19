import type { Stake } from '@/lib/database.types'

interface Props {
  stakes: Stake[]
}

export function DistrictStakes({ stakes }: Props) {
  if (stakes.length === 0) return null

  return (
    <div className="bg-surface border border-hair rounded-[14px] p-[clamp(20px,3vw,32px)] mt-[18px]">
      <h3 className="font-display text-[21px] font-bold tracking-[-0.02em] mb-[5px]">What&apos;s at stake in their district</h3>
      <div className="text-[14px] text-text-soft mb-[24px]">The fossil-fuel footprint they have direct influence over</div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-[14px]">
        {stakes.map((s, i) => (
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
  )
}
