'use client'

import { Check, X } from 'lucide-react'

interface PledgeBadgeProps {
  signed: boolean
}

export function PledgeBadge({ signed }: PledgeBadgeProps) {
  if (signed) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-success-bg border border-success rounded-full text-[11px] text-success">
        <Check className="w-3 h-3" />
        <span>Signed No Fossil Fuel Pledge</span>
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-error-bg border border-error rounded-full text-[11px] text-error">
      <X className="w-3 h-3" />
      <span>No Pledge Signed</span>
    </div>
  )
}
