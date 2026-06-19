import { formatMoney } from './utils'

interface Props {
  outsideFossil: number
  fossilDirect: number
}

export function OutsideMoney({ outsideFossil, fossilDirect }: Props) {
  if (outsideFossil <= 0) return null

  return (
    <div className="bg-surface border border-hair rounded-[14px] p-[clamp(20px,3vw,32px)] mt-[18px]">
      <h3 className="font-display text-[21px] font-bold tracking-[-0.02em] mb-[5px]">Outside & dark money</h3>
      <div className="text-[14px] text-text-soft mb-[24px]">
        Independent expenditures from fossil-fuel interests — money spent supporting them that doesn&apos;t count toward direct contributions
      </div>
      <div className="font-display font-bold text-[38px] tracking-[-0.03em] text-dark">{formatMoney(outsideFossil)}</div>
      <p className="text-text-soft text-[14.5px] mt-[8px] max-w-[620px]">
        Spent by fossil-aligned super PACs and 501(c)(4) &quot;dark money&quot; groups. That&apos;s{' '}
        {fossilDirect > 0 ? `${(outsideFossil / fossilDirect).toFixed(1)}× their direct contributions` : 'on top of direct contributions'}.
      </p>
      <div className="text-[12px] text-text-mute mt-[18px] pt-[14px] border-t border-hair">
        Source: independent-expenditure filings · <a href="#" className="text-crude-deep font-semibold">FEC ↗</a>
      </div>
    </div>
  )
}
