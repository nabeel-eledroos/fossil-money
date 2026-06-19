import type { VoteRecord } from '@/lib/database.types'

interface Props {
  votes: VoteRecord[]
  lcv: number | null
}

export function VotesPanel({ votes, lcv }: Props) {
  if (votes.length === 0) return null

  return (
    <div className="bg-surface border border-hair rounded-[14px] p-[clamp(20px,3vw,32px)] mt-[18px]">
      <h3 className="font-display text-[21px] font-bold tracking-[-0.02em] mb-[5px]">The votes behind the score</h3>
      <div className="text-[14px] text-text-soft mb-[24px]">Key climate & energy decisions LCV scored</div>
      <ul className="list-none">
        {votes.map((v, i) => (
          <li key={i} className="flex gap-[13px] py-[15px] border-b border-hair items-start last:border-b-0">
            <span className={`text-[10.5px] font-semibold px-[9px] py-[4px] rounded-[20px] whitespace-nowrap flex-none ${
              v.m === 'bad' ? 'bg-crude-soft text-crude-deep' : 'bg-leaf-soft text-leaf-deep'
            }`}>
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
        Source: {lcv !== null ? 'LCV Scorecard & Congress.gov' : 'council/commission records'} ·{' '}
        <a href="#" className="text-crude-deep font-semibold">view votes ↗</a>
      </div>
    </div>
  )
}
