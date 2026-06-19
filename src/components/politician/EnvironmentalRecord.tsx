interface LcvHistItem {
  y: string
  s: number
}

interface Props {
  lcv: number | null
  lcvHist: LcvHistItem[]
  localScore: string | null
}

function LcvGauge({ score, hist }: { score: number; hist: LcvHistItem[] }) {
  const r = 60
  const c = 2 * Math.PI * r
  const off = c * (1 - score / 100)
  const col = score >= 50 ? '#3f9d52' : '#c85a26'
  const verdict = score >= 70 
    ? 'a strong environmental voting record.' 
    : score >= 40 
      ? 'a mixed environmental voting record.' 
      : 'a weak environmental voting record.'

  return (
    <div className="flex gap-[28px] items-center flex-wrap">
      <div className="w-[140px] h-[140px] flex-none relative">
        <svg viewBox="0 0 140 140" width="140" height="140">
          <circle cx="70" cy="70" r={r} fill="none" stroke="#eceae4" strokeWidth="9" />
          <circle 
            cx="70" cy="70" r={r} fill="none" stroke={col} strokeWidth="9" strokeLinecap="round" 
            strokeDasharray={c} strokeDashoffset={off} transform="rotate(-90 70 70)"
            style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <b className="font-display font-bold text-[38px] text-ink leading-none tracking-[-0.03em]">{score}</b>
          <span className="text-[10px] font-semibold tracking-[0.1em] uppercase text-text-mute mt-[5px]">LCV / 100</span>
        </div>
      </div>
      <div className="flex-1 min-w-[200px]">
        <p className="text-[15px] text-text-soft leading-[1.55]">
          This official holds <b className="text-ink font-semibold">{verdict}</b> Annual LCV scores below.
        </p>
        <div className="flex gap-[8px] mt-[18px] items-end h-[64px]">
          {hist.map(h => (
            <div key={h.y} className="flex-1 flex flex-col items-center gap-[6px] justify-end h-full">
              <i className="w-full max-w-[22px] bg-leaf rounded-t-[3px]" style={{ height: `${h.s}%`, minHeight: '2px' }} />
              <small className="text-[10px] text-text-mute">&apos;{h.y.slice(2)}</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function LocalScoreBlock({ score }: { score: string }) {
  const good = ['A', 'B', 'B−'].includes(score)
  return (
    <div className="flex gap-[28px] items-center flex-wrap">
      <div 
        className="font-display font-bold text-[56px] leading-none tracking-[-0.04em]" 
        style={{ color: good ? 'var(--color-leaf-deep)' : 'var(--color-crude-deep)' }}
      >
        {score}
      </div>
      <div className="flex-1 min-w-[200px]">
        <p className="text-[15px] text-text-soft leading-[1.55]">
          Local officials don&apos;t receive an LCV score, so we grade them on their{' '}
          <b className="text-ink font-semibold">council and commission votes</b>. See the votes below.
        </p>
      </div>
    </div>
  )
}

export function EnvironmentalRecord({ lcv, lcvHist, localScore }: Props) {
  return (
    <div className="bg-surface border border-hair rounded-[14px] p-[clamp(20px,3vw,32px)] mt-[18px]">
      <h3 className="font-display text-[21px] font-bold tracking-[-0.02em] mb-[5px]">
        {lcv !== null ? 'Environmental record' : 'Local environmental record'}
      </h3>
      <div className="text-[14px] text-text-soft mb-[24px]">
        {lcv !== null ? 'LCV lifetime score and trend' : 'Grade from council & commission votes'}
      </div>
      {lcv !== null ? <LcvGauge score={lcv} hist={lcvHist} /> : <LocalScoreBlock score={localScore || '—'} />}
    </div>
  )
}
