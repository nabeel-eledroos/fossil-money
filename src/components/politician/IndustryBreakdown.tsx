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
      <h3 className="font-display text-[21px] font-bold tracking-[-0.02em] mb-[5px]">Breakdown by industry and type</h3>
      <div className="text-[14px] text-text-soft mb-[24px]">Fossil-fuel sectors and donation types</div>
      
      {subTot > 0 ? (
        <>
          <div className="segbar-group">
            <div className="segbar">
              {Object.entries(subIndustry).filter(([, v]) => v > 0).map(([k, v]) => (
                <i key={k} data-sector={k} style={{ width: `${v / subTot * 100}%`, background: SECTORS[k]?.color }} />
              ))}
            </div>
            <div className="flex flex-wrap gap-[11px_20px] mt-[18px]">
              {Object.entries(subIndustry).filter(([, v]) => v > 0).map(([k, v]) => (
                <div key={k} data-sector={k} className="sector-label flex items-center gap-[8px] text-[13.5px] text-text-soft">
                  <span className="w-[10px] h-[10px] rounded-[3px] flex-none" style={{ background: SECTORS[k]?.color }} />
                  {SECTORS[k]?.label} <b className="text-ink font-semibold num">{formatShort(v)}</b>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-[26px] segbar-group" data-type="donor-split">
            <div className="segbar">
              {pacPct > 0 && <i data-donor="pac" style={{ width: `${pacPct}%`, background: 'var(--color-crude-deep)' }} />}
              {(100 - pacPct) > 0 && <i data-donor="individual" style={{ width: `${100 - pacPct}%`, background: 'var(--color-mining)' }} />}
            </div>
            <div className="flex flex-wrap gap-[11px_20px] mt-[18px]">
              <div data-donor="pac" className="sector-label flex items-center gap-[8px] text-[13.5px] text-text-soft">
                <span className="w-[10px] h-[10px] rounded-[3px] flex-none" style={{ background: 'var(--color-crude-deep)' }} />
                PAC money <b className="text-ink font-semibold num">{formatMoney(donorSplit.pac)}</b>
              </div>
              <div data-donor="individual" className="sector-label flex items-center gap-[8px] text-[13.5px] text-text-soft">
                <span className="w-[10px] h-[10px] rounded-[3px] flex-none" style={{ background: 'var(--color-mining)' }} />
                Individuals <b className="text-ink font-semibold num">{formatMoney(donorSplit.individual)}</b>
              </div>
            </div>
          </div>
        </>
      ) : (
        <p className="text-text-soft italic text-[15px] leading-[1.5]">No fossil-fuel money to break down.</p>
      )}
    </div>
  )
}
