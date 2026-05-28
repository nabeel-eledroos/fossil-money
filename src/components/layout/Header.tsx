'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface HeaderProps {
  showBackButton?: boolean
}

export function Header({ showBackButton = false }: HeaderProps) {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-10 bg-surface-secondary/95 backdrop-blur border-b border-border">
      <div className="max-w-[680px] mx-auto px-6 py-4">
        <nav className="flex items-center justify-between">
          <Link 
            href="/" 
            className="flex items-center gap-2 text-[15px] font-medium text-primary hover:opacity-80 transition-opacity"
          >
            <div className="w-3.5 h-3.5 bg-accent rounded-full" />
            Fossil Money
          </Link>

          {!showBackButton && (
            <div className="flex gap-5">
              <NavLink href="/members" active={pathname === '/members'}>
                All members
              </NavLink>
              <NavLink href="/states" active={pathname === '/states'}>
                By state
              </NavLink>
              <NavLink href="/methodology" active={pathname === '/methodology'}>
                Methodology
              </NavLink>
              <NavLink href="/about" active={pathname === '/about'}>
                About
              </NavLink>
            </div>
          )}
        </nav>
      </div>
    </header>
  )
}

function NavLink({ 
  href, 
  active, 
  children 
}: { 
  href: string
  active?: boolean
  children: React.ReactNode 
}) {
  return (
    <Link
      href={href}
      className={cn(
        'text-xs transition-colors',
        active ? 'text-primary' : 'text-secondary hover:text-primary'
      )}
    >
      {children}
    </Link>
  )
}
