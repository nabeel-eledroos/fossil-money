'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { ZipSearchForm } from '@/components/forms'
import { RepCard } from '@/components/domain'
import { RepresentativeResponse } from '@/lib/database.types'

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
    <main className="min-h-screen">
      <header className="sticky top-0 z-10 bg-surface-secondary/95 backdrop-blur border-b border-border">
        <div className="max-w-[960px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <Link 
              href="/" 
              className="flex items-center gap-2 text-secondary hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <div className="w-3.5 h-3.5 bg-accent rounded-full" />
              <span className="font-medium text-primary hidden sm:inline">Fossil Money</span>
            </Link>
            
            <div className="flex-1 max-w-xs">
              <ZipSearchForm 
                onSubmit={handleNewSearch} 
                isLoading={isLoading}
                compact
              />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[960px] mx-auto px-6 py-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-12 h-12 border-4 border-border border-t-accent rounded-full animate-spin mb-4" />
            <p className="text-secondary">Loading representatives for {zip}...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24">
            <AlertCircle className="w-16 h-16 text-error mb-4" />
            <h2 className="text-lg font-semibold text-primary mb-2">Unable to find representatives</h2>
            <p className="text-secondary text-center max-w-md mb-6">{error}</p>
            <Link href="/" className="px-6 py-3 bg-accent hover:bg-accent-dark text-inverse rounded-lg transition-colors font-medium">
              Try another ZIP code
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-[28px] font-bold text-primary mb-2">
                Your Representatives for {zip}
              </h1>
              <p className="text-secondary">
                {reps.length} representative{reps.length !== 1 ? 's' : ''} found
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {reps.map((rep) => (
                <RepCard key={rep.id} rep={rep} zip={zip} />
              ))}
            </div>

            {reps.length === 0 && (
              <div className="bg-surface border border-border rounded-xl text-center py-16">
                <p className="text-secondary">
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
