'use client'

import { Flame } from 'lucide-react'
import { cn, formatMoneyFull } from '@/lib/utils'

interface FossilFuelAmountProps {
  amount: number
}

export function FossilFuelAmount({ amount }: FossilFuelAmountProps) {
  const formattedAmount = formatMoneyFull(amount)

  return (
    <div className="flex items-center gap-2">
      <Flame className={cn(
        'w-5 h-5',
        amount >= 500000 && 'text-error',
        amount >= 100000 && amount < 500000 && 'text-accent',
        amount >= 10000 && amount < 100000 && 'text-warning',
        amount < 10000 && 'text-success'
      )} />
      <span className={cn(
        'text-[22px] font-bold',
        amount >= 500000 && 'text-error',
        amount >= 100000 && amount < 500000 && 'text-accent',
        amount >= 10000 && amount < 100000 && 'text-warning',
        amount < 10000 && 'text-success'
      )}>
        {formattedAmount}
      </span>
    </div>
  )
}
