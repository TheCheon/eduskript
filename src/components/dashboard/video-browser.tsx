'use client'

import { Film } from 'lucide-react'
import type { VideoInfo } from '@/lib/skript-files'

interface VideoBrowserProps {
  videos: VideoInfo[]
  loading: boolean
  onVideoSelect: (video: VideoInfo) => void
  className?: string
}

export function VideoBrowser({ videos, loading, onVideoSelect, className }: VideoBrowserProps) {
  if (loading) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (videos.length === 0) {
    return (
      <div className={`p-4 text-center text-sm text-muted-foreground ${className}`}>
        <Film className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p>No videos available.</p>
        <p className="mt-1 text-xs">Upload videos via the Mux dashboard and they&apos;ll appear here.</p>
      </div>
    )
  }

  return (
    <div className={`p-2 space-y-1 ${className}`}>
      {videos.map((video) => (
        <button
          key={video.filename}
          onClick={() => onVideoSelect(video)}
          className="w-full flex items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-muted transition-colors"
          title={`Insert ${video.filename}`}
        >
          {/* Poster thumbnail or fallback icon */}
          {video.metadata.poster ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={video.metadata.poster}
              alt=""
              className="w-12 h-8 object-cover rounded flex-shrink-0 bg-muted"
            />
          ) : (
            <div className="w-12 h-8 flex items-center justify-center rounded flex-shrink-0 bg-muted">
              <Film className="w-4 h-4 text-muted-foreground" />
            </div>
          )}

          <span className="flex-1 min-w-0 truncate font-medium">{video.filename}</span>

          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
            {video.provider}
          </span>
        </button>
      ))}
    </div>
  )
}
