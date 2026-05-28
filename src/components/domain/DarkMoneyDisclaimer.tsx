import { Info } from 'lucide-react'

export function DarkMoneyDisclaimer() {
  return (
    <div className="mt-4 flex items-start gap-2 p-3 bg-surface-secondary rounded-lg border border-border">
      <Info className="w-4 h-4 text-tertiary flex-shrink-0 mt-0.5" />
      <p className="text-[11px] text-tertiary leading-relaxed">
        These figures represent disclosed donations only. &quot;Dark money&quot; contributions through 
        PACs and nonprofits may not be included. Data sourced from FEC filings and WhoBoughtMyRep.
      </p>
    </div>
  )
}
