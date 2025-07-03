'use client'

import { useState } from 'react'
import CodeMirrorEditor from '@/components/dashboard/codemirror-editor'
import MinimalCodeMirror from '@/components/dashboard/minimal-codemirror'
import SimpleCodeMirror from '@/components/dashboard/simple-codemirror'

export default function TestEditorPage() {
  const [content, setContent] = useState(`# Test Markdown

This is a test of the CodeMirror editor.

## Features

- Split view with live preview
- Markdown syntax highlighting
- Real-time preview using remark pipeline

\`\`\`javascript
console.log('Hello world!');
\`\`\`

**Bold text** and *italic text*.

- List item 1
- List item 2
- List item 3

| Column 1 | Column 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |
`)

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">CodeMirror Editor Test</h1>
      
      <div className="mb-8">
        <SimpleCodeMirror />
      </div>
      
      <div className="mb-8">
        <MinimalCodeMirror />
      </div>
      
      <div className="h-96">
        <CodeMirrorEditor
          content={content}
          onChange={setContent}
          onSave={() => console.log('Save clicked:', content)}
        />
      </div>
    </div>
  )
}
