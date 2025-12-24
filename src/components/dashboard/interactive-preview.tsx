'use client'

import { MarkdownRenderer } from '@/components/markdown/markdown-renderer.client'

interface InteractivePreviewProps {
  markdown: string
  onContentChange?: (newContent: string) => void
  fileList?: Array<{ id: string; name: string; url?: string; isDirectory?: boolean }>
  pageId?: string
  onExcalidrawEdit?: (filename: string, fileId: string) => void
}

export function InteractivePreview({
  markdown,
  onContentChange,
  fileList,
  pageId,
  onExcalidrawEdit,
}: InteractivePreviewProps) {
  // Filter out directories from the file list
  const filteredFileList = fileList?.filter(f => !f.isDirectory)

  return (
    <div className="prose-theme" key="markdown-preview">
      <MarkdownRenderer
        content={markdown}
        fileList={filteredFileList}
        pageId={pageId}
        onContentChange={onContentChange}
        onExcalidrawEdit={onExcalidrawEdit}
      />
    </div>
  )
}
