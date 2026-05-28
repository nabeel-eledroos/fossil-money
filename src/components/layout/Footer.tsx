import Link from 'next/link'

export function Footer() {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().toLocaleString('default', { month: 'long' })

  return (
    <footer className="border-t border-border pt-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-tertiary">
          Data: FEC filings · WhoBoughtMyRep · LCV Scorecard {currentYear}. Disclosed contributions only.
        </span>
        <div className="flex gap-3.5">
          <Link 
            href="https://github.com" 
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-tertiary hover:text-secondary transition-colors"
          >
            GitHub
          </Link>
          <Link 
            href="/methodology" 
            className="text-[11px] text-tertiary hover:text-secondary transition-colors"
          >
            Methodology
          </Link>
          <span className="text-[11px] text-tertiary">
            Updated {currentMonth} {currentYear}
          </span>
        </div>
      </div>
    </footer>
  )
}
