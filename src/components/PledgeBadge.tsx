'use client'

import { Check, X } from 'lucide-react'

interface PledgeBadgeProps {
  signed: boolean
}

export function PledgeBadge({ signed }: PledgeBadgeProps) {
  if (signed) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-900/50 border border-green-700 rounded-full text-xs text-green-400">
        <Check className="w-3 h-3" />
        <span>Signed No Fossil Fuel Pledge</span>
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-900/50 border border-red-700 rounded-full text-xs text-red-400">
      <X className="w-3 h-3" />
      <span>No Pledge Signed</span>
    </div>
  )
}
