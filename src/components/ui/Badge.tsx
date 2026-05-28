import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'party-r' | 'party-d' | 'party-i'
  size?: 'sm' | 'md'
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center font-medium rounded-full',
          // Variants
          variant === 'default' && 'bg-surface-tertiary text-secondary',
          variant === 'success' && 'bg-success-bg text-success',
          variant === 'warning' && 'bg-warning-bg text-warning',
          variant === 'error' && 'bg-error-bg text-error',
          variant === 'info' && 'bg-info-bg text-info',
          variant === 'party-r' && 'bg-party-r text-inverse',
          variant === 'party-d' && 'bg-party-d text-inverse',
          variant === 'party-i' && 'bg-party-i text-inverse',
          // Sizes
          size === 'sm' && 'px-2 py-0.5 text-[10px]',
          size === 'md' && 'px-2.5 py-1 text-[11px]',
          className
        )}
        {...props}
      />
    )
  }
)

Badge.displayName = 'Badge'

export function PartyBadge({ party, size = 'md' }: { party: string | null; size?: 'sm' | 'md' }) {
  const abbrev = party?.toUpperCase()
  let variant: BadgeProps['variant'] = 'party-i'
  
  if (abbrev === 'R' || abbrev === 'REPUBLICAN') {
    variant = 'party-r'
  } else if (abbrev === 'D' || abbrev === 'DEMOCRAT' || abbrev === 'DEMOCRATIC') {
    variant = 'party-d'
  }

  return (
    <Badge variant={variant} size={size}>
      {abbrev?.charAt(0) || 'I'}
    </Badge>
  )
}
