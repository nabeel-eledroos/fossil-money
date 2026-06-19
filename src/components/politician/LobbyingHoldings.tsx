import type { LobbyingFirm, Holding } from '@/lib/database.types'
import { formatMoney } from './utils'

interface Props {
  lobbying: {
    annual: number
    note: string
    firms: LobbyingFirm[]
  } | null
  holdings: Holding[]
}

export function LobbyingHoldings({ lobbying, holdings }: Props) {
  if (!lobbying && holdings.length === 0) return null

  return (
    <div className="grid grid-cols-2 gap-[18px] mt-[18px] max-lg:grid-cols-1">
      {lobbying && (
        <div className="bg-surface border border-hair rounded-[14px] p-[clamp(20px,3vw,32px)]">
          <h3 className="font-display text-[21px] font-bold tracking-[-0.02em] mb-[5px]">Fossil lobbying around them</h3>
          <div className="text-[14px] text-text-soft mb-[24px]">What fossil-fuel interests {lobbying.note}</div>
          <div className="flex justify-between gap-[14px] py-[13px] border-b border-hair items-baseline">
            <div className="text-[15px] text-ink font-medium">Total fossil lobbying, 2024</div>
            <div className="font-display font-bold text-[17px] text-ink whitespace-nowrap num">{formatMoney(lobbying.annual)}</div>
          </div>
          {lobbying.firms.map((f, i) => (
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
      {holdings.length > 0 && (
        <div className="bg-surface border border-hair rounded-[14px] p-[clamp(20px,3vw,32px)]">
          <h3 className="font-display text-[21px] font-bold tracking-[-0.02em] mb-[5px]">Personal fossil-fuel holdings</h3>
          <div className="text-[14px] text-text-soft mb-[24px]">Investments in fossil-fuel companies reported on their own financial disclosure</div>
          {holdings.map((h, i) => (
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
  )
}
