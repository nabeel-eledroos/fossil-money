'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export function ZipSearchForm() {
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

    router.push(`/results/${zip}`)
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex gap-2 max-w-[460px] mb-10">
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
          className="flex-1 px-5 py-3 border border-[var(--color-border-secondary)] rounded-full text-sm text-[var(--color-text-primary)] bg-[var(--color-background-primary)] focus:outline-none focus:ring-2 focus:ring-[#D85A30] focus:border-transparent"
        />
        <button
          type="submit"
          className="px-6 py-3 border border-[var(--color-border-secondary)] rounded-full text-sm text-[var(--color-text-primary)] bg-[var(--color-background-primary)] cursor-pointer whitespace-nowrap hover:bg-[var(--color-background-secondary)] transition-colors"
        >
          See my reps →
        </button>
      </form>
      {error && (
        <p className="text-sm text-red-500 -mt-8 mb-6">{error}</p>
      )}
    </>
  )
}
