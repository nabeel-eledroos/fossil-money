import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface ProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  value: number
  max?: number
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'error'
  size?: 'sm' | 'md'
}

export const ProgressBar = forwardRef<HTMLDivElement, ProgressBarProps>(
  ({ className, value, max = 100, variant = 'default', size = 'sm', ...props }, ref) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100))

    return (
      <div
        ref={ref}
        className={cn(
          'w-full bg-border rounded-full overflow-hidden',
          size === 'sm' && 'h-[3px]',
          size === 'md' && 'h-1.5',
          className
        )}
        {...props}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            variant === 'default' && 'bg-tertiary',
            variant === 'accent' && 'bg-accent',
            variant === 'success' && 'bg-success',
            variant === 'warning' && 'bg-warning',
            variant === 'error' && 'bg-error'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    )
  }
)

ProgressBar.displayName = 'ProgressBar'
