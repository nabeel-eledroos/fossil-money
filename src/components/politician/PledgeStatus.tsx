import type { PledgeStatus as PledgeStatusType } from '@/lib/database.types'

interface Props {
  pledge: PledgeStatusType
}

export function PledgeStatus({ pledge }: Props) {
  return (
    <div className={`mt-[22px] flex gap-[10px] items-start text-[15px] p-[13px_16px] rounded-[9px] ${
      pledge === 'signed' ? 'bg-leaf-soft text-leaf-deep' :
      pledge === 'broke' ? 'bg-alarm-soft text-alarm' :
      'bg-bg text-text-soft border border-hair'
    }`}>
      {pledge === 'signed' ? '✓' : pledge === 'broke' ? '⚠' : '○'}&nbsp;
      <span>
        {pledge === 'signed' ? (
          <><b className="font-bold">Signed the No Fossil Fuel Money pledge</b> and has kept it.</>
        ) : pledge === 'broke' ? (
          <><b className="font-bold">Signed the pledge — then took fossil-fuel money.</b> May be removed from the signer list.</>
        ) : (
          <>Has <b className="font-bold">not</b> signed the No Fossil Fuel Money pledge.</>
        )}
      </span>
    </div>
  )
}
