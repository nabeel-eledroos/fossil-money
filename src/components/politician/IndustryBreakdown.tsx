import type { SubsectorBreakdown, DonorSplit } from '@/lib/database.types'
import { formatMoney, formatShort, SECTORS } from './utils'

interface Props {
  subIndustry: SubsectorBreakdown
  donorSplit: DonorSplit
}

export function IndustryBreakdown({ subIndustry, donorSplit }: Props) {
  const subTot = Object.values(subIndustry).reduce((a, b) => a + b, 0)
  const dsTot = donorSplit.pac + donorSplit.individual
  const pacPct = dsTot ? Math.round(donorSplit.pac / dsTot * 100) : 0

  return (
    <div className="bg-surface border border-hair rounded-[14px] p-[clamp(20px,3vw,32px)]">
      <h3 className="font-display text-[21px] font-bold tracking-[-0.02em] mb-[5px]">Breakdown by industry</h3>
      <div className="text-[14px] text-text-soft mb-[24px]">Which fossil sectors the money comes from</div>
      
      {subTot > 0 ? (
        <>
          <div className="segbar">
            {Object.entries(subIndustry).filter(([, v]) => v > 0).map(([k, v]) => (
              <i key={k} style={{ width: `${v / subTot * 100}%`, background: SECTORS[k]?.color }} />
            ))}
          </div>
          <div className="flex flex-wrap gap-[11px_20px] mt-[18px]">
            {Object.entries(subIndustry).filter(([, v]) => v > 0).map(([k, v]) => (
              <div key={k} className="flex items-center gap-[8px] text-[13.5px] text-text-soft">
                <span className="w-[10px] h-[10px] rounded-[3px] flex-none" style={{ background: SECTORS[k]?.color }} />
                {SECTORS[k]?.label} <b className="text-ink font-semibold num">{formatShort(v)}</b>
              </div>
            ))}
          </div>
          <div className="mt-[26px]">
            <div className="flex justify-between text-[13px] text-text-soft mb-[8px]">
              <span>PAC money <b className="text-ink font-semibold">{formatMoney(donorSplit.pac)}</b></span>
              <span>Individuals <b className="text-ink font-semibold">{formatMoney(donorSplit.individual)}</b></span>
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
  )
}
