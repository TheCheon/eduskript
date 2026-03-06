'use client'

import { useMemo } from 'react'
import { MarkdownRenderer } from '@/components/markdown/markdown-renderer.client'
import type { VideoInfo } from '@/lib/skript-files'

interface InteractivePreviewProps {
  markdown: string
  onContentChange?: (newContent: string) => void
  fileList?: Array<{ id: string; name: string; url?: string; isDirectory?: boolean; updatedAt?: string | Date; width?: number; height?: number }>
  videoList?: VideoInfo[]
  pageId?: string
  skriptId?: string
  onExcalidrawEdit?: (filename: string, fileId: string) => void
}

export function InteractivePreview({
  markdown,
  onContentChange,
  fileList,
  videoList,
  pageId,
  skriptId,
  onExcalidrawEdit,
}: InteractivePreviewProps) {
  // Memoize to avoid new array reference on every parent re-render
  const filteredFileList = useMemo(() => fileList?.filter(f => !f.isDirectory), [fileList])

  return (
    <div className="prose-theme" key="markdown-preview">
      <MarkdownRenderer
        content={markdown}
        fileList={filteredFileList}
        videoList={videoList}
        pageId={pageId}
        skriptId={skriptId}
        onContentChange={onContentChange}
        onExcalidrawEdit={onExcalidrawEdit}
      />
    </div>
  )
}
