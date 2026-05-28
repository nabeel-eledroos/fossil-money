import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatMoney(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`
  }
  if (amount >= 1_000) {
    return `$${Math.round(amount / 1_000)}K`
  }
  return `$${Math.round(amount)}`
}

export function formatMoneyFull(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function getPartyColor(party: string | null): {
  bg: string
  text: string
  dot: string
  border: string
} {
  switch (party?.toUpperCase()) {
    case 'R':
    case 'REPUBLICAN':
      return {
        bg: 'bg-party-r-bg',
        text: 'text-party-r',
        dot: 'bg-party-r',
        border: 'border-party-r',
      }
    case 'D':
    case 'DEMOCRAT':
    case 'DEMOCRATIC':
      return {
        bg: 'bg-party-d-bg',
        text: 'text-party-d',
        dot: 'bg-party-d',
        border: 'border-party-d',
      }
    default:
      return {
        bg: 'bg-party-i-bg',
        text: 'text-party-i',
        dot: 'bg-party-i',
        border: 'border-party-i',
      }
  }
}

export function getPartyAbbreviation(party: string | null): string {
  if (!party) return 'I'
  const upper = party.toUpperCase()
  if (upper === 'REPUBLICAN' || upper === 'R') return 'R'
  if (upper === 'DEMOCRAT' || upper === 'DEMOCRATIC' || upper === 'D') return 'D'
  return party.charAt(0).toUpperCase()
}

export function getChamberLabel(chamber: string | null): string {
  if (chamber?.toLowerCase() === 'senate') return 'Senator'
  if (chamber?.toLowerCase() === 'house') return 'Representative'
  return chamber || ''
}

export function getDistrictLabel(
  state: string | null,
  district: string | null,
  chamber: string | null
): string {
  if (!state) return ''
  if (chamber?.toLowerCase() === 'house' && district) {
    return `${state}-${district}`
  }
  return state
}
