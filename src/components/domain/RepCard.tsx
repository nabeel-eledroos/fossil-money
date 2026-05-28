'use client'

import Image from 'next/image'
import { RepresentativeResponse } from '@/lib/database.types'
import { LcvTrendBadge } from './LcvTrendBadge'
import { FossilFuelAmount } from './FossilFuelAmount'
import { ContactButton } from './ContactButton'
import { ShareButton } from './ShareButton'
import { PledgeBadge } from './PledgeBadge'
import { DarkMoneyDisclaimer } from './DarkMoneyDisclaimer'
import { PartyBadge } from '@/components/ui'
import { User } from 'lucide-react'
import { cn, getChamberLabel, getDistrictLabel } from '@/lib/utils'

interface RepCardProps {
  rep: RepresentativeResponse
  zip: string
}

export function RepCard({ rep, zip }: RepCardProps) {
  const chamberLabel = getChamberLabel(rep.chamber)
  const districtLabel = getDistrictLabel(rep.state, rep.district, rep.chamber)
  const isRepublican = rep.party === 'Republican' || rep.party === 'R'
  const isDemocrat = rep.party === 'Democrat' || rep.party === 'Democratic' || rep.party === 'D'

  return (
    <div className={cn(
      'bg-surface rounded-xl p-6 shadow-md border-2',
      isRepublican && 'border-party-r',
      isDemocrat && 'border-party-d',
      !isRepublican && !isDemocrat && 'border-party-i'
    )}>
      <div className="flex items-start gap-4">
        <div className={cn(
          'relative w-20 h-20 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden',
          isRepublican && 'bg-party-r',
          isDemocrat && 'bg-party-d',
          !isRepublican && !isDemocrat && 'bg-party-i'
        )}>
          {rep.photoUrl ? (
            <Image 
              src={rep.photoUrl} 
              alt={rep.name}
              fill
              sizes="80px"
              className="object-cover"
            />
          ) : (
            <User className="w-10 h-10 text-inverse" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-bold text-primary truncate">
              {rep.name}
            </h3>
            <PartyBadge party={rep.party} size="sm" />
          </div>
          <p className="text-secondary mt-1">
            {chamberLabel} - {districtLabel}
          </p>
          <div className="mt-2">
            <PledgeBadge signed={rep.signedPledge} />
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="bg-surface-secondary rounded-lg p-4">
          <p className="text-[11px] text-tertiary uppercase tracking-wide mb-1">Fossil Fuel Money</p>
          <FossilFuelAmount amount={rep.fossilFuelTotal} />
        </div>
        <div className="bg-surface-secondary rounded-lg p-4">
          <p className="text-[11px] text-tertiary uppercase tracking-wide mb-1">LCV Score Trend</p>
          <LcvTrendBadge scores={rep.lcvScores} />
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <ContactButton
          email={rep.contactEmail}
          repName={rep.name}
          zip={zip}
          amount={rep.fossilFuelTotal}
        />
        <ShareButton politicianId={rep.id} name={rep.name} />
      </div>

      <DarkMoneyDisclaimer />
    </div>
  )
}
