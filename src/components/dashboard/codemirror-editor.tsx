'use client'

import { useEffect, useRef, useState } from 'react'
import { processMarkdown } from '@/lib/markdown'
import { Button } from '@/components/ui/button'
import { Save, Eye, EyeOff } from 'lucide-react'

interface CodeMirrorEditorProps {
  content: string
  onChange: (content: string) => void
  onSave?: () => void
  isReadOnly?: boolean
}

export default function CodeMirrorEditor({ 
  content, 
  onChange, 
  onSave,
  isReadOnly = false 
}: CodeMirrorEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const editorViewRef = useRef<any>(null)
  const [showPreview, setShowPreview] = useState(true)
  const [previewContent, setPreviewContent] = useState('')
  const [isMounted, setIsMounted] = useState(false)
  const [useSimpleEditor, setUseSimpleEditor] = useState(false)
  const [textareaContent, setTextareaContent] = useState(content || '')

  // Fallback for content
  const editorContent = content || ''

  // Ensure component is mounted
  useEffect(() => {
    setIsMounted(true)
    console.log('CodeMirrorEditor mounting...')
  }, [])

  // Process markdown for preview
  useEffect(() => {
    if (!isMounted) return
    
    const updatePreview = async () => {
      try {
        const processed = await processMarkdown(useSimpleEditor ? textareaContent : editorContent)
        setPreviewContent(processed.content)
      } catch (error) {
        console.error('Error processing markdown:', error)
        setPreviewContent('<p>Error processing markdown</p>')
      }
    }
    
    updatePreview()
  }, [editorContent, textareaContent, useSimpleEditor, isMounted])  // Initialize CodeMirror with dynamic imports
  useEffect(() => {
    if (!isMounted || !editorRef.current) return

    // Set a hard timeout to fallback to simple editor
    const fallbackTimeout = setTimeout(() => {
      console.log('Forcing fallback to simple editor due to timeout')
      setUseSimpleEditor(true)
    }, 5000) // Increased timeout to 5 seconds

    const initializeCodeMirror = async () => {
      try {
        console.log('Attempting to load CodeMirror...')
        
        // Try to import CodeMirror modules one by one with better error handling
        console.log('Loading codemirror (basic setup)...')
        const { basicSetup } = await import('codemirror')
        
        console.log('Loading @codemirror/view...')
        const { EditorView } = await import('@codemirror/view')
        
        console.log('Loading @codemirror/state...')
        const { EditorState } = await import('@codemirror/state')
        
        console.log('Loading @codemirror/lang-markdown...')
        const { markdown } = await import('@codemirror/lang-markdown')
        
        console.log('All CodeMirror modules loaded successfully')

        console.log('Creating editor state...')
        const startState = EditorState.create({
          doc: editorContent,
          extensions: [
            basicSetup,
            markdown(),
            EditorView.updateListener.of((update: any) => {
              if (update.docChanged) {
                const newContent = update.state.doc.toString()
                onChange(newContent)
              }
            }),
            EditorView.theme({
              '&': {
                height: 'auto',
                minHeight: '400px',
              },
              '.cm-content': {
                padding: '12px',
                fontSize: '14px',
                lineHeight: '1.5',
              },
              '.cm-focused': {
                outline: 'none',
              },
            }),
          ],
        })

        console.log('Creating editor view...')
        const view = new EditorView({
          state: startState,
          parent: editorRef.current!,
        })

        editorViewRef.current = view
        clearTimeout(fallbackTimeout)
        console.log('CodeMirror initialized successfully')

        return () => {
          view.destroy()
          editorViewRef.current = null
        }
      } catch (error) {
        console.error('Error loading CodeMirror:', error)
        if (error instanceof Error) {
          console.error('Error details:', error.message)
          console.error('Error stack:', error.stack)
        }
        clearTimeout(fallbackTimeout)
        setUseSimpleEditor(true)
      }
    }

    initializeCodeMirror()

    // Cleanup function
    return () => {
      clearTimeout(fallbackTimeout)
    }
  }, [isMounted])

  // Update editor content when prop changes
  useEffect(() => {
    if (editorViewRef.current && editorContent !== editorViewRef.current.state.doc.toString()) {
      try {
        const transaction = editorViewRef.current.state.update({
          changes: {
            from: 0,
            to: editorViewRef.current.state.doc.length,
            insert: editorContent,
          },
        })
        editorViewRef.current.dispatch(transaction)
      } catch (error) {
        console.error('Error updating editor content:', error)
      }
    }
  }, [editorContent])

  // Handle textarea change for simple editor
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    setTextareaContent(newContent)
    onChange(newContent)
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
      {/* Toolbar */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2"
          >
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </Button>
          <span className="text-xs text-blue-600">
            {useSimpleEditor ? 'Simple Editor (CodeMirror Failed)' : 'CodeMirror Loaded'}
          </span>
        </div>
        
        {onSave && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSave}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save
          </Button>
        )}
      </div>

      {/* Editor and Preview */}
      <div className="flex h-full min-h-[400px]">
        {/* Editor */}
        <div className={`${showPreview ? 'w-1/2' : 'w-full'} ${showPreview ? 'border-r border-gray-200 dark:border-gray-700' : ''}`}>
          {useSimpleEditor ? (
            <textarea
              value={textareaContent}
              onChange={handleTextareaChange}
              readOnly={isReadOnly}
              className="w-full h-full p-3 border-0 bg-transparent text-gray-900 dark:text-gray-100 font-mono text-sm resize-none focus:outline-none"
              placeholder="Start typing your markdown here..."
            />
          ) : (
            <div ref={editorRef} className="h-full" />
          )}
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="w-1/2 overflow-auto">
            <div
              className="p-4 prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: previewContent }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
