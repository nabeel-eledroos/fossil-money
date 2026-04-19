'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { ZipInput } from '@/components/ZipInput'
import { RepCard } from '@/components/RepCard'
import { RepresentativeResponse } from '@/lib/database.types'
import { Flame, ArrowLeft, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ zip: string }>
}

export default function ResultsPage({ params }: PageProps) {
  const { zip } = use(params)
  const router = useRouter()
  const [reps, setReps] = useState<RepresentativeResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchReps() {
      try {
        const res = await fetch(`/api/reps?zip=${zip}`)
        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch representatives')
        }

        setReps(data.representatives)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchReps()
  }, [zip])

  const handleNewSearch = (newZip: string) => {
    setIsLoading(true)
    setError(null)
    router.push(`/results/${newZip}`)
  }

  return (
    <main className="min-h-screen bg-slate-900">
      <header className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <Link 
              href="/" 
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <Flame className="w-6 h-6 text-orange-500" />
              <span className="font-semibold text-white hidden sm:inline">Fossil Money</span>
            </Link>
            
            <div className="flex-1 max-w-xs">
              <ZipInput 
                onSubmit={handleNewSearch} 
                isLoading={isLoading}
                className="!max-w-full"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-12 h-12 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin mb-4" />
            <p className="text-slate-400">Loading representatives for {zip}...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24">
            <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Unable to find representatives</h2>
            <p className="text-slate-400 text-center max-w-md mb-6">{error}</p>
            <Link
              href="/"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Try another ZIP code
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-white mb-2">
                Your Representatives for {zip}
              </h1>
              <p className="text-slate-400">
                {reps.length} representative{reps.length !== 1 ? 's' : ''} found
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {reps.map((rep) => (
                <RepCard key={rep.id} rep={rep} zip={zip} />
              ))}
            </div>

            {reps.length === 0 && (
              <div className="text-center py-16">
                <p className="text-slate-400">
                  No representatives found for this ZIP code. This may be a data issue.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
