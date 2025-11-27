'use client'

import dynamic from 'next/dynamic'
import type { ReactElement } from 'react'

interface MuxVideoProps {
  src: string // playbackId
  poster?: string
  className?: string
  alt?: string
  blurDataURL?: string | null
  aspectRatio?: number | null
}

// Dynamic import with ssr: false ensures client-only rendering
// The loading component handles the server-side placeholder
const MuxPlayer = dynamic(
  () => import('@mux/mux-player-react').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <span
        className="block bg-muted animate-pulse rounded-lg"
        style={{ aspectRatio: '16/9' }}
      />
    )
  }
)

export function MuxVideo(props: MuxVideoProps): ReactElement {
  const { src: playbackId, poster, blurDataURL, aspectRatio, alt, className } = props

  return (
    <MuxPlayer
      playbackId={playbackId}
      poster={poster}
      placeholder={blurDataURL ?? ''}
      accentColor="hsl(var(--primary))"
      className={className}
      style={{ aspectRatio: aspectRatio ?? 16 / 9 }}
      autoPlay={alt ? alt.includes('autoplay') : false}
      loop={alt ? alt.includes('loop') : false}
      disableTracking // Disable Mux analytics to avoid CORS issues
    />
  )
}
