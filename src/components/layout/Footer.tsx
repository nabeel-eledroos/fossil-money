interface FooterProps {
  maxWidth?: string
}

export function Footer({ maxWidth = '1120px' }: FooterProps) {
  return (
    <footer className="border-t border-[var(--color-hair)]">
      <div 
        className="px-[clamp(20px,5vw,72px)] py-[34px] mx-auto flex flex-wrap gap-[18px] justify-between items-center"
        style={{ maxWidth }}
      >
        <p className="text-[13px] text-[var(--color-text-mute)] leading-[1.65] max-w-[700px]">
          <b className="text-[var(--color-crude)] font-semibold">Fossil Money</b> tracks fossil-fuel contributions to elected officials. Data from FEC, LCV, and state filings. Not affiliated with any campaign or party.
        </p>
        <span className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[var(--color-text-soft)] border border-[var(--color-hair)] px-[13px] py-[6px] rounded-[20px] whitespace-nowrap">v0.3 prototype</span>
      </div>
    </footer>
  )
}
