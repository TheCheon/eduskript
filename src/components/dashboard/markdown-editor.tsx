'use client'

import dynamic from 'next/dynamic'

interface MarkdownEditorProps {
  content: string
  onChange: (content: string) => void
  onSave?: () => void
  isReadOnly?: boolean
}

// Create a client-only version using dynamic import
const CodeMirrorEditor = dynamic(
  () => import('./codemirror-editor'),
  {
    ssr: false,
    loading: () => (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
        <div className="p-4 min-h-[400px] flex items-center justify-center text-gray-500">
          Loading editor...
        </div>
      </div>
    )
  }
)

export function MarkdownEditor(props: MarkdownEditorProps) {
  return <CodeMirrorEditor {...props} />
}
