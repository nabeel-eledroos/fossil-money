import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'pill'
  error?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant = 'default', error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full bg-surface text-primary',
          'border transition-colors',
          'placeholder:text-tertiary',
          'focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent',
          'disabled:cursor-not-allowed disabled:opacity-50',
          // Variants
          variant === 'default' && 'px-4 py-3 text-[13px] rounded-lg border-border-strong',
          variant === 'pill' && 'px-5 py-3 text-[13px] rounded-full border-border-strong',
          // Error state
          error && 'border-error focus:ring-error',
          className
        )}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'
