'use client'

import Image from 'next/image'
import { useState, useCallback } from 'react'
import type { SkriptFilesData } from '@/lib/skript-files'
import { resolveExcalidraw } from '@/lib/skript-files'
import { ResizableWrapper } from './resizable-wrapper'

interface ExcalidrawImageProps {
  src: string // Filename (e.g., "drawing.excalidraw")
  alt?: string
  style?: React.CSSProperties
  onWidthChange?: (markdown: string) => void
  align?: 'left' | 'center' | 'right'
  wrap?: boolean
  // Files data for resolving URLs (serializable)
  files?: SkriptFilesData
  // Source line tracking for editor sync
  sourceLineStart?: string
  sourceLineEnd?: string
}

export function ExcalidrawImage({ src, alt, style, onWidthChange, align = 'center', wrap = false, files, sourceLineStart, sourceLineEnd }: ExcalidrawImageProps) {
  const filename = src
  const caption = alt || ''

  // Resolve light/dark URLs
  const resolved = files ? resolveExcalidraw(files, src) : undefined
  const lightSrc = resolved?.lightUrl ?? ''
  const darkSrc = resolved?.darkUrl ?? ''

  const [lightLoaded, setLightLoaded] = useState(false)
  const [darkLoaded, setDarkLoaded] = useState(false)

  // Parse initial width from style
  const initialWidth = style?.width && typeof style.width === 'string' && style.width.includes('%')
    ? parseFloat(style.width)
    : 100

  // Handle layout changes from the wrapper
  const handleLayoutChange = useCallback((layout: { width: number; align: 'left' | 'center' | 'right'; wrap: boolean }) => {
    if (!onWidthChange) return

    // Build <Image> component with props
    let props = `src="${filename}" alt="${alt || ''}" width="${Math.round(layout.width)}%"`
    if (layout.align !== 'center') {
      props += ` align="${layout.align}"`
    }
    if (layout.wrap) {
      props += ` wrap`
    }

    onWidthChange(`<Image ${props} />`)
  }, [alt, filename, onWidthChange])

  // Early return if file can't be resolved
  if (!lightSrc && !darkSrc) {
    return (
      <span className="block bg-muted rounded-lg p-4 text-center text-muted-foreground my-4">
        <span className="block">Excalidraw file not found: {src}</span>
        <span className="block text-xs mt-1">Make sure the .excalidraw file has light/dark SVG exports</span>
      </span>
    )
  }

  // Build data attributes for source line tracking
  const dataAttributes: Record<string, string> = { excalidraw: filename }
  if (sourceLineStart) dataAttributes['source-line-start'] = sourceLineStart
  if (sourceLineEnd) dataAttributes['source-line-end'] = sourceLineEnd

  return (
    <ResizableWrapper
      initialWidth={initialWidth}
      align={align}
      wrap={wrap}
      onLayoutChange={onWidthChange ? handleLayoutChange : undefined}
      className="excalidraw-wrapper"
      dataAttributes={dataAttributes}
    >
      {/* Render both images, CSS controls visibility based on theme */}
      {lightSrc && (
        <Image
          src={lightSrc}
          alt={caption}
          width={800}
          height={600}
          onLoad={() => setLightLoaded(true)}
          className={`excalidraw-light w-full h-auto rounded-md transition-opacity duration-200 dark:hidden ${
            lightLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          unoptimized
        />
      )}
      {darkSrc && (
        <Image
          src={darkSrc}
          alt={caption}
          width={800}
          height={600}
          onLoad={() => setDarkLoaded(true)}
          className={`excalidraw-dark w-full h-auto rounded-md transition-opacity duration-200 hidden dark:block ${
            darkLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          unoptimized
        />
      )}
      {caption && (
        <span className="block mt-2 text-sm text-center text-muted-foreground italic">
          {caption}
        </span>
      )}
    </ResizableWrapper>
  )
}
