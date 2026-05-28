'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

interface ZipSearchFormProps {
  onSubmit?: (zip: string) => void
  isLoading?: boolean
  compact?: boolean
}

export function ZipSearchForm({ onSubmit, isLoading = false, compact = false }: ZipSearchFormProps) {
  const router = useRouter()
  const [zip, setZip] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!/^\d{5}$/.test(zip)) {
      setError('Please enter a valid 5-digit ZIP code')
      return
    }

    if (onSubmit) {
      onSubmit(zip)
    } else {
      router.push(`/results/${zip}`)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className={`flex gap-2 ${compact ? '' : 'max-w-[460px] mb-10'}`}>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={5}
          value={zip}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, '')
            setZip(value)
            if (error) setError('')
          }}
          placeholder="Enter ZIP code"
          disabled={isLoading}
          className="flex-1 px-5 py-3 text-[13px] rounded-full border border-border-strong bg-surface text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
        />
        <button 
          type="submit" 
          disabled={isLoading}
          className="px-6 py-3 rounded-full text-[13px] font-medium whitespace-nowrap bg-surface border border-border-strong text-primary hover:bg-surface-secondary transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Loading...' : 'See my reps →'}
        </button>
      </form>
      {error && (
        <p className="text-sm text-error -mt-8 mb-6">{error}</p>
      )}
    </>
  )
}
