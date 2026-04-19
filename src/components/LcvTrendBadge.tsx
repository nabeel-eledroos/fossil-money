'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface LcvTrendBadgeProps {
  scores: Record<string, number>
}

export function LcvTrendBadge({ scores }: LcvTrendBadgeProps) {
  const years = Object.keys(scores).sort((a, b) => Number(b) - Number(a))
  
  if (years.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-slate-500 text-sm">No data</span>
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

  const scoreColor = latestScore >= 70 
    ? 'text-green-400' 
    : latestScore >= 40 
    ? 'text-yellow-400' 
    : 'text-red-400'

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor = trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-slate-400'

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2">
        <span className={`text-2xl font-bold ${scoreColor}`}>
          {latestScore}%
        </span>
        {previousScore !== null && (
          <div className={`flex items-center ${trendColor}`}>
            <TrendIcon className="w-4 h-4" />
            <span className="text-xs ml-0.5">
              {trendDiff > 0 ? '+' : ''}{trendDiff}
            </span>
          </div>
        )}
      </div>
      
      {years.length > 1 && (
        <div className="flex gap-2 mt-2">
          {years.slice(0, 3).map((year) => (
            <div key={year} className="text-xs text-slate-500">
              <span className="text-slate-400">{year.slice(-2)}:</span> {scores[year]}%
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
