'use client'

import { useState, FormEvent } from 'react'
import { Search } from 'lucide-react'

interface ZipInputProps {
  onSubmit: (zip: string) => void
  isLoading?: boolean
  className?: string
}

export function ZipInput({ onSubmit, isLoading = false, className = '' }: ZipInputProps) {
  const [zip, setZip] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!/^\d{5}$/.test(zip)) {
      setError('Please enter a valid 5-digit ZIP code')
      return
    }

    onSubmit(zip)
  }

  return (
    <form onSubmit={handleSubmit} className={`w-full max-w-md ${className}`}>
      <div className="relative">
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
          placeholder="Enter your ZIP code"
          className="w-full px-6 py-4 text-lg bg-slate-800 border border-slate-700 rounded-full text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || zip.length !== 5}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-full transition-colors"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Search className="w-5 h-5 text-white" />
          )}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-400 text-center">{error}</p>
      )}
    </form>
  )
}
