import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          // Variants
          variant === 'primary' && 'bg-accent text-inverse hover:bg-accent-dark',
          variant === 'secondary' && 'bg-surface text-primary border border-border-strong hover:bg-surface-secondary',
          variant === 'ghost' && 'text-secondary hover:bg-surface-secondary hover:text-primary',
          variant === 'outline' && 'border border-border-strong text-primary hover:bg-surface-secondary',
          // Sizes
          size === 'sm' && 'h-8 px-3 text-[13px] rounded-lg',
          size === 'md' && 'h-10 px-4 text-[13px] rounded-lg',
          size === 'lg' && 'h-12 px-6 text-[15px] rounded-xl',
          className
        )}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'
