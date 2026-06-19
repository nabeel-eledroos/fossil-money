interface Props {
  upThisCycle: boolean
  next: string
  lastMargin: string
  since: string
}

export function ElectionPanel({ upThisCycle, next, lastMargin, since }: Props) {
  return (
    <div className="bg-surface border border-hair rounded-[14px] p-[clamp(20px,3vw,32px)] mt-[18px]">
      <h3 className="font-display text-[21px] font-bold tracking-[-0.02em] mb-[5px]">Your move</h3>
      <div className="text-[14px] text-text-soft mb-[24px]">When you can weigh in at the ballot box</div>
      <div className="flex flex-wrap gap-0 border border-hair rounded-[9px] overflow-hidden mb-[18px]">
        <div className="flex-1 min-w-[130px] p-[16px_18px] border-l border-hair first:border-l-0">
          <div className={`font-display font-bold text-[19px] text-ink tracking-[-0.01em] ${upThisCycle ? 'text-leaf-deep' : ''}`}>
            {upThisCycle ? 'On the ballot' : 'Not up yet'}
          </div>
          <div className="text-[12px] text-text-mute mt-[5px]">this cycle</div>
        </div>
        <div className="flex-1 min-w-[130px] p-[16px_18px] border-l border-hair">
          <div className="font-display font-bold text-[19px] text-ink tracking-[-0.01em]">{next}</div>
          <div className="text-[12px] text-text-mute mt-[5px]">next election</div>
        </div>
        <div className="flex-1 min-w-[130px] p-[16px_18px] border-l border-hair">
          <div className="font-display font-bold text-[19px] text-ink tracking-[-0.01em]">{lastMargin}</div>
          <div className="text-[12px] text-text-mute mt-[5px]">last margin</div>
        </div>
        <div className="flex-1 min-w-[130px] p-[16px_18px] border-l border-hair">
          <div className="font-display font-bold text-[19px] text-ink tracking-[-0.01em]">{since}</div>
          <div className="text-[12px] text-text-mute mt-[5px]">in office since</div>
        </div>
      </div>
      <p className="text-[14.5px] text-text-soft mb-[10px]">
        {upThisCycle 
          ? "This seat is up this cycle — your vote is the most direct lever you have." 
          : "Not on the ballot this cycle, but public pressure between elections still moves votes."}
      </p>
      <a 
        href="https://vote.gov" 
        target="_blank" 
        rel="noopener" 
        className="font-body font-semibold text-[14px] px-[22px] py-[13px] rounded-[9px] border border-hair-strong bg-transparent text-ink cursor-pointer inline-flex items-center gap-[9px] hover:border-ink transition-[border-color]"
      >
        Check your registration ↗
      </a>
    </div>
  )
}
