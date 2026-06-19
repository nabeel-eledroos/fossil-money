'use client'

import { useState } from 'react'
import { formatMoney } from './utils'

interface Props {
  id: string
  name: string
  office: string
  fossilDirect: number
  fossilPct: number
  outsideFossil: number
  lcv: number | null
}

export function EmailComposer({ id, name, office, fossilDirect, fossilPct, outsideFossil, lcv }: Props) {
  const [copied, setCopied] = useState(false)

  const emailBody = `Dear ${office} ${name},

I'm a constituent writing to ask you to stop accepting campaign contributions from fossil-fuel companies and their affiliated PACs.

Public records indicate your campaigns have accepted about ${formatMoney(fossilDirect)} from oil, gas, coal, and utility interests — roughly ${fossilPct}% of your total funding${outsideFossil > 0 ? `, with another ${formatMoney(outsideFossil)} in outside spending on your behalf` : ''}${lcv !== null ? `, and your lifetime LCV score is ${lcv} out of 100` : ''}. As your constituent, I find this concerning given the urgency of the climate crisis.

I am asking you to publicly pledge to refuse further fossil-fuel money and to prioritize the long-term health of our communities.

I will be paying close attention to your decisions on energy and climate.

Sincerely,
[Your name]
[Your address]`

  const copyEmail = () => {
    navigator.clipboard?.writeText(emailBody).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  const mailtoHref = `mailto:${id}@office.gov?subject=${encodeURIComponent('Stop accepting fossil-fuel contributions')}&body=${encodeURIComponent(emailBody)}`
  const lastName = name.split(' ').slice(-1)[0]

  return (
    <div className="bg-surface border border-hair rounded-[14px] p-[clamp(22px,3.5vw,38px)] mt-[30px]">
      <span className="label text-crude-deep">Take action</span>
      <h3 className="font-display text-[clamp(23px,3.4vw,32px)] font-bold tracking-[-0.025em] my-[11px_9px]">
        Tell {lastName} to drop the fossil money
      </h3>
      <p className="text-text-soft text-[15.5px] max-w-[600px] leading-[1.55]">
        We&apos;ve drafted a letter using their real numbers. Edit anything, then send it or copy it.
      </p>
      
      <div className="mt-[26px] flex flex-col gap-[15px]">
        <div className="flex gap-[15px] flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-text-soft block mb-[8px]">To</label>
            <input 
              defaultValue={`${id}@office.gov`} 
              className="w-full bg-bg border border-hair-strong rounded-[9px] px-[15px] py-[13px] font-body text-[15px] text-ink outline-none transition-[border-color] focus:border-ink" 
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-text-soft block mb-[8px]">From (your email)</label>
            <input 
              placeholder="you@email.com" 
              className="w-full bg-bg border border-hair-strong rounded-[9px] px-[15px] py-[13px] font-body text-[15px] text-ink outline-none transition-[border-color] focus:border-ink" 
            />
          </div>
        </div>
        <div>
          <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-text-soft block mb-[8px]">Subject</label>
          <input 
            defaultValue="Stop accepting fossil-fuel contributions" 
            className="w-full bg-bg border border-hair-strong rounded-[9px] px-[15px] py-[13px] font-body text-[15px] text-ink outline-none transition-[border-color] focus:border-ink" 
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-text-soft block mb-[8px]">Message</label>
          <textarea 
            defaultValue={emailBody} 
            className="w-full bg-bg border border-hair-strong rounded-[9px] px-[15px] py-[13px] font-body text-[15px] text-ink outline-none transition-[border-color] resize-y leading-[1.6] min-h-[250px] focus:border-ink" 
          />
        </div>
      </div>
      
      <div className="flex gap-[12px] flex-wrap mt-[20px] items-center">
        <a 
          href={mailtoHref} 
          className="font-body font-semibold text-[14px] px-[22px] py-[13px] rounded-[9px] bg-ink text-white cursor-pointer inline-flex items-center gap-[9px] transition-[transform,opacity] hover:-translate-y-[2px] hover:opacity-90"
        >
          ✉ Open in email app
        </a>
        <button 
          onClick={copyEmail} 
          className="font-body font-semibold text-[14px] px-[22px] py-[13px] rounded-[9px] border border-hair-strong bg-transparent text-ink cursor-pointer transition-[border-color] hover:border-ink"
        >
          Copy message
        </button>
        <span className={`text-[13px] font-semibold text-leaf-deep transition-opacity duration-300 ${copied ? 'opacity-100' : 'opacity-0'}`}>
          Copied ✓
        </span>
      </div>
    </div>
  )
}
