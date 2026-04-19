'use client'

import { Flame } from 'lucide-react'

interface FossilFuelAmountProps {
  amount: number
}

export function FossilFuelAmount({ amount }: FossilFuelAmountProps) {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)

  const severity = amount >= 500000 
    ? 'text-red-400' 
    : amount >= 100000 
    ? 'text-orange-400' 
    : amount >= 10000
    ? 'text-yellow-400'
    : 'text-green-400'

  return (
    <div className="flex items-center gap-2">
      <Flame className={`w-5 h-5 ${severity}`} />
      <span className={`text-2xl font-bold ${severity}`}>
        {formattedAmount}
      </span>
    </div>
  )
}
