import type { TopDonor } from '@/lib/database.types'
import { formatMoney, SECTORS } from './utils'

interface Props {
  donors: TopDonor[]
}

export function TopDonors({ donors }: Props) {
  const maxDonor = donors.length ? Math.max(...donors.map(d => d.amt)) : 1

  return (
    <div className="bg-surface border border-hair rounded-[14px] p-[clamp(20px,3vw,32px)]">
      <h3 className="font-display text-[21px] font-bold tracking-[-0.02em] mb-[5px]">Who&apos;s writing the checks</h3>
      <div className="text-[14px] text-text-soft mb-[24px]">Largest fossil-fuel contributors</div>
      
      {donors.length > 0 ? (
        donors.map((d, i) => (
          <div key={i} className="grid grid-cols-[1fr_auto] gap-[6px_14px] items-center py-[14px] border-b border-hair last:border-b-0">
            <div className="font-semibold text-[15.5px] text-ink">
              {d.n}
              <small className="block font-normal text-text-mute text-[11.5px] mt-[2px] tracking-[0.02em]">
                {SECTORS[d.sector]?.label || d.sector} · {d.type}{d.employer && ` · ${d.employer}`}
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
  )
}
