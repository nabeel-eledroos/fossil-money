'use client'

import { Info } from 'lucide-react'

export function DarkMoneyDisclaimer() {
  return (
    <div className="mt-4 flex items-start gap-2 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
      <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-slate-500 leading-relaxed">
        These figures represent disclosed donations only. &quot;Dark money&quot; contributions through 
        PACs and nonprofits may not be included. Data sourced from FEC filings and WhoBoughtMyRep.
      </p>
    </div>
  )
}
