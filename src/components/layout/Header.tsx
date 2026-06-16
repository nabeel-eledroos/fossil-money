'use client'

import Link from 'next/link'
import { useTheme } from '@/components/providers/ThemeProvider'
import { Sun, Moon } from 'lucide-react'

interface HeaderProps {
  maxWidth?: string
}

export function Header({ maxWidth = '1120px' }: HeaderProps) {
  const { theme, toggleTheme, mounted } = useTheme()

  return (
    <header className="sticky top-0 z-50 bg-[var(--color-bg)]/90 backdrop-blur-[12px] border-b border-[var(--color-hair)]">
      <div 
        className="mx-auto px-[clamp(20px,5vw,72px)] py-[18px] flex items-center justify-between"
        style={{ maxWidth }}
      >
        <Link href="/" className="flex items-center gap-[11px] cursor-pointer">
          <div className="w-[22px] h-[22px] rounded-full border-[1.5px] border-[var(--color-ink)] relative flex-none">
            <div className="absolute inset-[4px] rounded-full bg-[var(--color-crude)]" />
          </div>
          <b className="font-display font-bold text-[18px] text-[var(--color-ink)]">Fossil&nbsp;Money</b>
        </Link>
        {mounted ? (
          <button
            onClick={toggleTheme}
            className="p-2 rounded-md text-[var(--color-text-soft)] hover:text-[var(--color-ink)] hover:bg-[var(--color-hair)] transition-colors"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        ) : (
          <div className="w-9 h-9" />
        )}
      </div>
    </header>
  )
}
