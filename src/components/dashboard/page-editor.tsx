'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MarkdownEditor } from '@/components/dashboard/markdown-editor'
import { ArrowLeft, Save, Eye, Clock, History } from 'lucide-react'
import { useSession } from 'next-auth/react'

interface PageEditorProps {
  script: any
  chapter: any
  page: any
}

export function PageEditor({ script, chapter, page }: PageEditorProps) {
  const [title, setTitle] = useState(page.title || '')
  const [slug, setSlug] = useState(page.slug || '')
  const [content, setContent] = useState(page.content || '')
  const [isPublished, setIsPublished] = useState(page.isPublished || false)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const router = useRouter()
  const { data: session } = useSession()

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle)
    setSlug(generateSlug(newTitle))
    setHasUnsavedChanges(true)
  }

  const handleContentChange = (newContent: string) => {
    setContent(newContent)
    setHasUnsavedChanges(true)
  }

  const handleSave = async () => {
    if (!title.trim() || !slug.trim()) {
      alert('Title and slug are required')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(`/api/pages/${page.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim(),
          content,
          isPublished
        })
      })

      if (response.ok) {
        setLastSaved(new Date())
        setHasUnsavedChanges(false)
        // Update URL if slug changed
        if (slug !== page.slug) {
          router.replace(`/dashboard/scripts/${script.slug}/chapters/${chapter.slug}/pages/${slug}/edit`)
        }
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to save page')
      }
    } catch (error) {
      console.error('Error saving page:', error)
      alert('Failed to save page')
    }
    setIsSaving(false)
  }

  const handlePublishToggle = () => {
    setIsPublished(!isPublished)
    setHasUnsavedChanges(true)
  }

  // Auto-save every 30 seconds if there are unsaved changes
  useEffect(() => {
    if (hasUnsavedChanges) {
      const timer = setTimeout(() => {
        handleSave()
      }, 30000)
      return () => clearTimeout(timer)
    }
  }, [hasUnsavedChanges, content, title, slug, isPublished])

  // Save with Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/scripts/${script.slug}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Script
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Edit Page
            </h1>
            {hasUnsavedChanges && (
              <div className="w-2 h-2 bg-orange-500 rounded-full" title="Unsaved changes" />
            )}
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            {script.title} → {chapter.title}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePublishToggle}>
            <Eye className="w-4 h-4 mr-2" />
            {isPublished ? 'Unpublish' : 'Publish'}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isPublished ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span>{isPublished ? 'Published' : 'Draft'}</span>
          </div>
          {lastSaved && (
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3" />
              <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <History className="w-3 h-3" />
          <span>Version {page.currentVersion || 1}</span>
        </div>
      </div>

      {/* Page Settings - Moved to top */}
      <Card>
        <CardHeader>
          <CardTitle>Page Settings</CardTitle>
          <CardDescription>
            Configure page metadata and settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Page Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Enter page title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="url-friendly-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Publication Status</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant={isPublished ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsPublished(true)}
                >
                  Published
                </Button>
                <Button
                  variant={!isPublished ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsPublished(false)}
                >
                  Draft
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Editor - Full width */}
      <Card>
        <CardHeader>
          <CardTitle>Content</CardTitle>
          <CardDescription>
            Write your content using the markdown editor. Ctrl+S to save.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MarkdownEditor
            content={content}
            onChange={handleContentChange}
            onSave={handleSave}
          />
        </CardContent>
      </Card>
    </div>
  )
}
