'use client'

import { Mail } from 'lucide-react'
import { generateMailtoLink } from '@/lib/email-template'

interface ContactButtonProps {
  email: string | null
  repName: string
  zip: string
  amount: number
}

export function ContactButton({ email, repName, zip, amount }: ContactButtonProps) {
  if (!email) {
    return (
      <button disabled className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-surface-tertiary text-tertiary rounded-lg cursor-not-allowed">
        <Mail className="w-4 h-4" />
        <span>No email available</span>
      </button>
    )
  }

  const mailtoLink = generateMailtoLink({
    email,
    repName,
    zipCode: zip,
    amount
  })

  return (
    <a
      href={mailtoLink}
      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-accent hover:bg-accent-dark text-inverse rounded-lg transition-colors font-medium"
    >
      <Mail className="w-4 h-4" />
      <span>Contact</span>
    </a>
  )
}
