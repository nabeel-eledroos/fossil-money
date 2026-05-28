'use client'

import { useState } from 'react'
import { Share2, Check } from 'lucide-react'

interface ShareButtonProps {
  politicianId: string
  name: string
}

export function ShareButton({ politicianId, name }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)

  const shareUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/politician/${politicianId}`
    : ''

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Check out ${name}'s fossil fuel donations`,
          url: shareUrl
        })
      } catch {
        // User cancelled share
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        // Clipboard failed
      }
    }
  }

  return (
    <button
      onClick={handleShare}
      className="flex items-center justify-center gap-2 px-4 py-3 bg-surface border border-border-strong hover:bg-surface-secondary text-primary rounded-lg transition-colors"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 text-success" />
          <span className="text-success">Copied!</span>
        </>
      ) : (
        <>
          <Share2 className="w-4 h-4" />
          <span>Share</span>
        </>
      )}
    </button>
  )
}
