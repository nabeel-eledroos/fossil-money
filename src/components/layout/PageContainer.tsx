import { cn } from '@/lib/utils'

interface PageContainerProps {
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function PageContainer({ children, size = 'md', className }: PageContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto px-6 py-8',
        size === 'sm' && 'max-w-[480px]',
        size === 'md' && 'max-w-[680px]',
        size === 'lg' && 'max-w-[960px]',
        className
      )}
    >
      {children}
    </div>
  )
}
