'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ZipInput } from '@/components/ZipInput'
import { Flame } from 'lucide-react'

export default function Home() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = (zip: string) => {
    setIsLoading(true)
    router.push(`/results/${zip}`)
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Flame className="w-12 h-12 text-orange-500" />
          <h1 className="text-5xl md:text-6xl font-bold text-white">
            Fossil Money
          </h1>
        </div>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto">
          Discover how much fossil fuel money your elected officials accept
          and hold them accountable for climate action.
        </p>
      </div>

      <ZipInput onSubmit={handleSubmit} isLoading={isLoading} />

      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl w-full">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
            <span className="text-2xl">🔍</span>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Enter Your ZIP</h3>
          <p className="text-slate-400 text-sm">
            Find your 2 senators and house representative instantly
          </p>
        </div>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
            <span className="text-2xl">💰</span>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">See The Money</h3>
          <p className="text-slate-400 text-sm">
            View fossil fuel donations and climate voting scores
          </p>
        </div>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
            <span className="text-2xl">📧</span>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Take Action</h3>
          <p className="text-slate-400 text-sm">
            Contact your reps with pre-written templates
          </p>
        </div>
      </div>

      <footer className="mt-auto pt-16 pb-8 text-center text-slate-500 text-sm">
        <p>
          Data from WhoBoughtMyRep, LCV Scorecard, and FEC filings.
        </p>
        <p className="mt-1">
          Built for transparency and climate accountability.
        </p>
      </footer>
    </main>
  )
}
