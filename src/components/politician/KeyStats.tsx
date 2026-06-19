import type { PoliticianProfile } from '@/lib/database.types'
import { formatMoney, formatShort } from './utils'

interface Props {
  profile: PoliticianProfile
  isFlagged: boolean
}

export function KeyStats({ profile: p, isFlagged }: Props) {
  const recLabel = p.lcv !== null ? p.lcv : (p.localScore || '—')

  return (
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
  )
}
