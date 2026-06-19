import Image from 'next/image'
import type { PoliticianProfile } from '@/lib/database.types'

interface Props {
  profile: PoliticianProfile
}

export function PoliticianHeader({ profile: p }: Props) {
  return (
    <div className="flex gap-[26px] flex-wrap items-center pb-[30px] border-b border-hair">
      <div className="w-[88px] h-[88px] rounded-full flex-none bg-surface border border-hair-strong flex items-center justify-center font-display font-semibold text-[30px] text-text-soft overflow-hidden">
        {p.photoUrl ? (
          <Image 
            src={p.photoUrl} 
            alt={p.name}
            width={88}
            height={88}
            className="object-cover w-full h-full"
          />
        ) : (
          p.initials
        )}
      </div>
      <div className="flex-1 min-w-[260px]">
        <span className="label block mb-[12px]">
          {p.level} · {p.party === 'NP' ? 'Nonpartisan' : p.party === 'D' ? 'Democrat' : 'Republican'}
          {p.state && p.party !== 'NP' ? ` · ${p.state}` : ''}
        </span>
        <h1 className="font-display text-[clamp(34px,5.5vw,58px)] font-bold tracking-[-0.035em]">{p.name}</h1>
        <div className="text-[18px] text-text-soft mt-[10px]">{p.office}</div>
        <div className="flex gap-[7px] mt-[16px] flex-wrap">
          {p.committee && <span className="chip lever">{p.committee}</span>}
          {p.upThisCycle && <span className="chip pledge-broke">On the ballot {p.next}</span>}
        </div>
      </div>
    </div>
  )
}
