'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LcvTrendBadgeProps {
  scores: Record<string, number>
}

export function LcvTrendBadge({ scores }: LcvTrendBadgeProps) {
  const years = Object.keys(scores).sort((a, b) => Number(b) - Number(a))
  
  if (years.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-tertiary text-sm">No data</span>
      </div>
    )
  }

  const latestYear = years[0]
  const latestScore = scores[latestYear]
  const previousYear = years[1]
  const previousScore = previousYear ? scores[previousYear] : null

  let trend: 'up' | 'down' | 'stable' = 'stable'
  let trendDiff = 0

  if (previousScore !== null) {
    trendDiff = latestScore - previousScore
    if (trendDiff > 0) trend = 'up'
    else if (trendDiff < 0) trend = 'down'
  }

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2">
        <span className={cn(
          'text-[22px] font-bold',
          latestScore >= 70 && 'text-success',
          latestScore >= 40 && latestScore < 70 && 'text-warning',
          latestScore < 40 && 'text-error'
        )}>
          {latestScore}%
        </span>
        {previousScore !== null && (
          <div className={cn(
            'flex items-center',
            trend === 'up' && 'text-success',
            trend === 'down' && 'text-error',
            trend === 'stable' && 'text-tertiary'
          )}>
            <TrendIcon className="w-4 h-4" />
            <span className="text-[11px] ml-0.5">
              {trendDiff > 0 ? '+' : ''}{trendDiff}
            </span>
          </div>
        )}
      </div>
      
      {years.length > 1 && (
        <div className="flex gap-2 mt-2">
          {years.slice(0, 3).map((year) => (
            <div key={year} className="text-[11px] text-tertiary">
              <span className="text-secondary">{year.slice(-2)}:</span> {scores[year]}%
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
