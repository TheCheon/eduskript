'use client'

import { useEffect, useRef, useState } from 'react'

export default function SimpleCodeMirror() {
  const editorRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState('Initializing...')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !editorRef.current) return

    const initEditor = async () => {
      try {
        setStatus('Loading CodeMirror modules...')
        console.log('Starting CodeMirror initialization...')
        
        // Import basic modules
        const { basicSetup } = await import('codemirror')
        const { EditorView } = await import('@codemirror/view')
        const { EditorState } = await import('@codemirror/state')
        const { markdown } = await import('@codemirror/lang-markdown')
        
        console.log('Modules imported successfully')
        setStatus('Creating editor...')
        
        // Create a very basic editor
        const state = EditorState.create({
          doc: '# Test\n\nCodeMirror is working!',
          extensions: [basicSetup, markdown()]
        })
        
        const view = new EditorView({
          state,
          parent: editorRef.current!
        })
        
        console.log('Editor created successfully')
        setStatus('CodeMirror ready!')
        
        return () => {
          view.destroy()
        }
      } catch (error) {
        console.error('CodeMirror initialization error:', error)
        setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    initEditor()
  }, [mounted])

  if (!mounted) {
    return <div className="p-4">Loading...</div>
  }

  return (
    <div className="p-4 border border-gray-300 rounded">
      <h3 className="text-lg font-semibold mb-2">Simple CodeMirror Test</h3>
      <div className="mb-2 text-sm text-gray-600">Status: {status}</div>
      <div ref={editorRef} className="border border-gray-200 rounded min-h-[100px]" />
    </div>
  )
}
