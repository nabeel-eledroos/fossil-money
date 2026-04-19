'use client'

import { RepresentativeResponse } from '@/lib/database.types'
import { LcvTrendBadge } from './LcvTrendBadge'
import { FossilFuelAmount } from './FossilFuelAmount'
import { ContactButton } from './ContactButton'
import { ShareButton } from './ShareButton'
import { PledgeBadge } from './PledgeBadge'
import { DarkMoneyDisclaimer } from './DarkMoneyDisclaimer'
import { User } from 'lucide-react'

interface RepCardProps {
  rep: RepresentativeResponse
  zip: string
}

export function RepCard({ rep, zip }: RepCardProps) {
  const partyColor = rep.party === 'D' 
    ? 'bg-blue-600' 
    : rep.party === 'R' 
    ? 'bg-red-600' 
    : 'bg-gray-600'

  const partyBorderColor = rep.party === 'D' 
    ? 'border-blue-500' 
    : rep.party === 'R' 
    ? 'border-red-500' 
    : 'border-gray-500'

  const chamberLabel = rep.chamber === 'senate' ? 'Senator' : 'Representative'
  const districtLabel = rep.chamber === 'house' && rep.district 
    ? `${rep.state}-${rep.district}` 
    : rep.state

  return (
    <div className={`bg-slate-800 rounded-xl border-2 ${partyBorderColor} overflow-hidden shadow-lg hover:shadow-xl transition-shadow`}>
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className={`relative w-20 h-20 rounded-full ${partyColor} flex items-center justify-center flex-shrink-0 overflow-hidden`}>
            {rep.photoUrl ? (
              <img 
                src={rep.photoUrl} 
                alt={rep.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-10 h-10 text-white" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl font-bold text-white truncate">
                {rep.name}
              </h3>
              <span className={`px-2 py-0.5 rounded text-xs font-semibold text-white ${partyColor}`}>
                {rep.party}
              </span>
            </div>
            <p className="text-slate-400 mt-1">
              {chamberLabel} - {districtLabel}
            </p>
            <div className="mt-2">
              <PledgeBadge signed={rep.signedPledge} />
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="bg-slate-900 rounded-lg p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Fossil Fuel Money</p>
            <FossilFuelAmount amount={rep.fossilFuelTotal} />
          </div>
          <div className="bg-slate-900 rounded-lg p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">LCV Score Trend</p>
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
    </div>
  )
}
