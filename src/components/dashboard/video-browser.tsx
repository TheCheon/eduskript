'use client'

import { useState } from 'react'
import { Film, Copy, Check, Search } from 'lucide-react'
import type { VideoInfo } from '@/lib/skript-files'

interface VideoBrowserProps {
  videos: VideoInfo[]
  loading: boolean
  className?: string
}

export function VideoBrowser({ videos, loading, className }: VideoBrowserProps) {
  const [query, setQuery] = useState('')
  const [copiedFilename, setCopiedFilename] = useState<string | null>(null)

  const filtered = query.trim()
    ? videos.filter(v => v.filename.toLowerCase().includes(query.toLowerCase()))
    : videos

  const handleCopy = async (filename: string) => {
    try {
      await navigator.clipboard.writeText(filename)
      setCopiedFilename(filename)
      setTimeout(() => setCopiedFilename(null), 1500)
    } catch {
      // clipboard not available, silently ignore
    }
  }

  const handleDragStart = (e: React.DragEvent, video: VideoInfo) => {
    e.dataTransfer.setData('application/Eduskript-mux-video', JSON.stringify(video))
    e.dataTransfer.effectAllowed = 'copy'
  }

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
    <div className={`flex flex-col ${className}`}>
      {/* Search */}
      <div className="px-2 pt-2 pb-1">
        <div className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1">
          <Search className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Filter videos…"
            className="flex-1 text-xs bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Scrollable list */}
      <div className="overflow-y-auto max-h-64 p-1 space-y-0.5">
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">No matches</p>
        ) : (
          filtered.map(video => (
            <div
              key={video.filename}
              draggable
              onDragStart={e => handleDragStart(e, video)}
              className="group flex items-center gap-2 rounded-md p-2 text-sm hover:bg-muted transition-colors cursor-grab active:cursor-grabbing"
              title={`Drag to insert ${video.filename}`}
            >
              {/* Poster or fallback */}
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

              <span className="flex-1 min-w-0 truncate font-medium text-xs">{video.filename}</span>

              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
                {video.provider}
              </span>

              {/* Copy filename button */}
              <button
                onClick={e => { e.stopPropagation(); handleCopy(video.filename) }}
                className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-accent"
                title="Copy filename to clipboard"
              >
                {copiedFilename === video.filename ? (
                  <Check className="w-3.5 h-3.5 text-green-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </button>
            </div>
          ))
        )}
      </div>

      <p className="px-3 py-1.5 text-xs text-muted-foreground border-t">
        Drag a video into the editor to insert it
      </p>
    </div>
  )
}
