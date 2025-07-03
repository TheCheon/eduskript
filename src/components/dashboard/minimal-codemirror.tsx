'use client'

import { useEffect, useRef, useState } from 'react'

export default function MinimalCodeMirror() {
  const editorRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState('Loading...')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initEditor = async () => {
      try {
        setStatus('Importing @codemirror/view...')
        const { EditorView } = await import('@codemirror/view')
        
        setStatus('Importing @codemirror/state...')
        const { EditorState } = await import('@codemirror/state')
        
        setStatus('Importing @codemirror/lang-markdown...')
        const { markdown } = await import('@codemirror/lang-markdown')
        
        setStatus('Creating editor state...')
        const state = EditorState.create({
          doc: '# Hello CodeMirror\n\nThis is a test.',
          extensions: [markdown()]
        })
        
        setStatus('Creating editor view...')
        const view = new EditorView({
          state,
          parent: editorRef.current!
        })
        
        setStatus('CodeMirror loaded successfully!')
        
        return () => {
          view.destroy()
        }
      } catch (err) {
        console.error('Error:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
        setStatus('Failed to load CodeMirror')
      }
    }

    if (editorRef.current) {
      initEditor()
    }
  }, [])

  return (
    <div className="p-4">
      <h2 className="text-xl mb-4">Minimal CodeMirror Test</h2>
      <div className="mb-4">
        <strong>Status:</strong> {status}
      </div>
      {error && (
        <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}
      <div className="border border-gray-300 rounded p-2">
        <div ref={editorRef} />
      </div>
    </div>
  )
}
