'use client'

import { useState, useEffect, useRef } from 'react'
import { AnnotationLayer } from '@/components/annotations/annotation-layer'
import { MarkdownRenderer } from '@/components/markdown/markdown-renderer'

interface AnnotatableContentProps {
  pageId: string
  content: string
  domain?: string
  skriptId?: string
}

// Module-level cache for file lists to avoid refetching on navigation
const fileListCache = new Map<string, Array<{ id: string, name: string, url?: string, isDirectory?: boolean }>>()

export function AnnotatableContent({ pageId, content, domain, skriptId }: AnnotatableContentProps) {
  // Initialize with cached data if available (this runs synchronously before render)
  const [fileList, setFileList] = useState<Array<{ id: string, name: string, url?: string, isDirectory?: boolean }>>(
    () => (skriptId ? fileListCache.get(skriptId) : undefined) || []
  )
  const fetchedRef = useRef<string | null>(null)

  // Fetch files for this skript if skriptId is provided (in background, don't block render)
  useEffect(() => {
    if (!skriptId) return

    // Skip if already fetched for this skriptId
    if (fetchedRef.current === skriptId && fileListCache.has(skriptId)) {
      return
    }

    const fetchFiles = async () => {
      try {
        const response = await fetch(`/api/upload?skriptId=${skriptId}`)
        if (response.ok) {
          const data = await response.json()
          const files = data.files || []
          fileListCache.set(skriptId, files)
          fetchedRef.current = skriptId
          setFileList(files)
        }
      } catch (error) {
        console.error('Error fetching files for markdown:', error)
      }
    }

    fetchFiles()
  }, [skriptId])

  // Build context for React markdown renderer
  const context = {
    pageId,
    domain,
    skriptId,
    fileList
  }

  // Always render content immediately - files load in background
  return (
    <AnnotationLayer pageId={pageId} content={content}>
      <MarkdownRenderer
        content={content}
        context={context}
      />
    </AnnotationLayer>
  )
}
