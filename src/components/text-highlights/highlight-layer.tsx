'use client'

import { useRef, useEffect, useCallback, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { nanoid } from 'nanoid'
import { useSyncedUserData } from '@/lib/userdata'
import type { TextHighlightsData, TextHighlightColor, TextHighlight } from '@/lib/text-highlights/types'
import { anchorHighlight, extractContext, findSectionId } from '@/lib/text-highlights/anchoring'
import { applyHighlightMark, removeHighlightMark, clearAllHighlightMarks } from '@/lib/text-highlights/rendering'

const HIGHLIGHT_COLORS: TextHighlightColor[] = ['yellow', 'red', 'green', 'blue', 'purple']

/** CSS class for the toolbar swatch dots (matches CSS variables in globals.css) */
const COLOR_SWATCH_CLASSES: Record<TextHighlightColor, string> = {
  yellow: 'bg-[--text-highlight-swatch-yellow]',
  red: 'bg-[--text-highlight-swatch-red]',
  green: 'bg-[--text-highlight-swatch-green]',
  blue: 'bg-[--text-highlight-swatch-blue]',
  purple: 'bg-[--text-highlight-swatch-purple]',
}

interface HighlightLayerProps {
  pageId: string
  children: ReactNode
}

type ToolbarMode =
  | { type: 'create'; x: number; y: number }
  | null

/**
 * Text highlighting layer. Sits inside AnnotationWrapper and adds
 * the ability to select prose text and highlight it with colored marks.
 * Data persists via useSyncedUserData (IndexedDB + server sync).
 */
export function HighlightLayer({ pageId, children }: HighlightLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { data, updateData } = useSyncedUserData<TextHighlightsData>(
    pageId,
    'text-highlights',
    { highlights: [] },
  )
  const dataRef = useRef(data)
  useEffect(() => {
    dataRef.current = data
  }, [data])

  const [toolbar, setToolbar] = useState<ToolbarMode>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const [hoveredHighlightId, setHoveredHighlightId] = useState<string | null>(null)
  const hoverDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** Set hover immediately, cancelling any pending dismiss */
  const showEditToolbar = useCallback((id: string) => {
    if (hoverDismissTimer.current) {
      clearTimeout(hoverDismissTimer.current)
      hoverDismissTimer.current = null
    }
    setHoveredHighlightId(id)
  }, [])

  /** Dismiss hover after a short delay (lets cursor travel to the toolbar) */
  const scheduleDismissEditToolbar = useCallback(() => {
    hoverDismissTimer.current = setTimeout(() => {
      setHoveredHighlightId(null)
      hoverDismissTimer.current = null
    }, 150)
  }, [])

  // Find the article root (closest article.prose-theme ancestor)
  const getArticleRoot = useCallback((): Element | null => {
    return containerRef.current?.closest('article.prose-theme') ?? containerRef.current
  }, [])

  // Re-anchor and render all highlights
  const renderHighlights = useCallback(() => {
    const root = getArticleRoot()
    if (!root || !data) return

    clearAllHighlightMarks(root)

    for (const highlight of data.highlights) {
      const range = anchorHighlight(highlight, root)
      if (range) {
        applyHighlightMark(range, highlight)
      }
    }
  }, [data, getArticleRoot])

  // Render highlights after data loads/changes, with delay for hydration
  useEffect(() => {
    const timer = setTimeout(renderHighlights, 200)
    return () => clearTimeout(timer)
  }, [renderHighlights])

  // Check if a node is inside a code block or editor
  const isInsideCodeBlock = useCallback((node: Node): boolean => {
    let el: Element | null =
      node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement
    while (el) {
      const tag = el.tagName
      if (tag === 'PRE' || tag === 'CODE' || el.classList.contains('cm-editor')) return true
      el = el.parentElement
    }
    return false
  }, [])

  // Handle text selection (pointerup)
  useEffect(() => {
    const handlePointerUp = (e: PointerEvent) => {
      // Ignore clicks on the toolbar itself
      if (toolbarRef.current?.contains(e.target as Node)) return

      const selection = window.getSelection()
      if (!selection || selection.isCollapsed || !selection.rangeCount) {
        setToolbar(null)
        return
      }

      const range = selection.getRangeAt(0)
      const selectedText = range.toString().trim()
      if (!selectedText) {
        setToolbar(null)
        return
      }

      // Refuse to highlight inside code blocks
      if (isInsideCodeBlock(range.startContainer) || isInsideCodeBlock(range.endContainer)) {
        setToolbar(null)
        return
      }

      // Make sure selection is within our container
      if (!containerRef.current?.contains(range.commonAncestorContainer)) {
        setToolbar(null)
        return
      }

      // Position toolbar above the selection
      const rect = range.getBoundingClientRect()
      setToolbar({
        type: 'create',
        x: rect.left + rect.width / 2,
        y: rect.top,
      })
    }

    document.addEventListener('pointerup', handlePointerUp)
    return () => document.removeEventListener('pointerup', handlePointerUp)
  }, [isInsideCodeBlock])

  // Track hover over highlight marks and the edit toolbar (portaled to body).
  // Uses document-level listener so the portaled toolbar is included.
  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement

      // Entered a highlight mark
      const mark = target.closest?.('mark.text-highlight')
      if (mark) {
        showEditToolbar((mark as HTMLElement).dataset.highlightId ?? '')
        return
      }

      // Entered the edit toolbar (keeps it alive while cursor is on it)
      if (target.closest?.('.highlight-edit-toolbar')) {
        if (hoverDismissTimer.current) {
          clearTimeout(hoverDismissTimer.current)
          hoverDismissTimer.current = null
        }
        return
      }
    }

    const handleMouseOut = (e: MouseEvent) => {
      const from = e.target as HTMLElement
      const to = e.relatedTarget as HTMLElement | null

      // Only care about leaving marks or the toolbar
      const leavingMark = !!from.closest?.('mark.text-highlight')
      const leavingToolbar = !!from.closest?.('.highlight-edit-toolbar')
      if (!leavingMark && !leavingToolbar) return

      // Don't dismiss if moving to another mark or the toolbar
      if (to?.closest?.('mark.text-highlight') || to?.closest?.('.highlight-edit-toolbar')) return

      scheduleDismissEditToolbar()
    }

    document.addEventListener('mouseover', handleMouseOver)
    document.addEventListener('mouseout', handleMouseOut)
    return () => {
      document.removeEventListener('mouseover', handleMouseOver)
      document.removeEventListener('mouseout', handleMouseOut)
    }
  }, [showEditToolbar, scheduleDismissEditToolbar])

  // Dismiss toolbar on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setToolbar(null)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Create a highlight from the current selection
  const createHighlight = useCallback(
    (color: TextHighlightColor) => {
      const selection = window.getSelection()
      if (!selection || selection.isCollapsed || !selection.rangeCount) return

      const range = selection.getRangeAt(0)
      const text = range.toString()
      if (!text.trim()) return

      const articleRoot = getArticleRoot()
      if (!articleRoot) return

      const { prefix, suffix } = extractContext(range, articleRoot)
      const sectionId = findSectionId(range.startContainer)

      const highlight: TextHighlight = {
        id: nanoid(),
        text,
        prefix,
        suffix,
        sectionId,
        color,
        createdAt: Date.now(),
      }

      const current = dataRef.current ?? { highlights: [] }
      updateData({ highlights: [...current.highlights, highlight] })

      // Apply immediately
      const newRange = anchorHighlight(highlight, articleRoot)
      if (newRange) {
        applyHighlightMark(newRange, highlight)
      }

      selection.removeAllRanges()
      setToolbar(null)
    },
    [getArticleRoot, updateData],
  )

  // Change a highlight's color
  const updateHighlightColor = useCallback(
    (id: string, color: TextHighlightColor) => {
      const current = dataRef.current ?? { highlights: [] }
      updateData({
        highlights: current.highlights.map((h) =>
          h.id === id ? { ...h, color } : h,
        ),
      })
      // Update mark classes in the DOM immediately
      const marks = document.querySelectorAll(`mark[data-highlight-id="${CSS.escape(id)}"]`)
      marks.forEach((mark) => {
        HIGHLIGHT_COLORS.forEach((c) => mark.classList.remove(`text-highlight-${c}`))
        mark.classList.add(`text-highlight-${color}`)
      })
      setHoveredHighlightId(null)
    },
    [updateData],
  )

  // Remove a highlight
  const deleteHighlight = useCallback(
    (id: string) => {
      removeHighlightMark(id)
      const current = dataRef.current ?? { highlights: [] }
      updateData({
        highlights: current.highlights.filter((h) => h.id !== id),
      })
      setToolbar(null)
      setHoveredHighlightId(null)
    },
    [updateData],
  )

  return (
    <div ref={containerRef}>
      {children}
      {toolbar &&
        createPortal(
          <FloatingToolbar
            ref={toolbarRef}
            position={toolbar}
            onSelectColor={createHighlight}
            onDismiss={() => setToolbar(null)}
          />,
          document.body,
        )}
      {hoveredHighlightId &&
        createPortal(
          <HighlightEditToolbar
            highlightId={hoveredHighlightId}
            currentColor={data?.highlights.find((h) => h.id === hoveredHighlightId)?.color}
            onChangeColor={updateHighlightColor}
            onDelete={deleteHighlight}
          />,
          document.body,
        )}
    </div>
  )
}

// --- Floating Toolbar (color picker on text selection) ---

import { forwardRef } from 'react'

interface FloatingToolbarProps {
  position: { x: number; y: number }
  onSelectColor: (color: TextHighlightColor) => void
  onDismiss: () => void
}

const FloatingToolbar = forwardRef<HTMLDivElement, FloatingToolbarProps>(
  function FloatingToolbar({ position, onSelectColor, onDismiss }, ref) {
    const style: React.CSSProperties = {
      position: 'fixed',
      left: position.x,
      top: position.y - 8,
      transform: 'translate(-50%, -100%)',
      zIndex: 9999,
    }

    return (
      <div
        role="presentation"
        className="fixed inset-0 z-[9998]"
        onClick={(e) => {
          if (e.target === e.currentTarget) onDismiss()
        }}
      >
        <div
          ref={ref}
          style={style}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-popover px-2 py-1.5 shadow-lg"
        >
          {HIGHLIGHT_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={`h-5 w-5 rounded-full border border-black/10 dark:border-white/10 transition-transform hover:scale-125 focus:outline-none focus:ring-2 focus:ring-ring ${COLOR_SWATCH_CLASSES[color]}`}
              title={`Highlight ${color}`}
              onClick={() => onSelectColor(color)}
            />
          ))}
        </div>
      </div>
    )
  },
)

// --- Edit toolbar (appears on highlight hover: color swatches + delete) ---

interface HighlightEditToolbarProps {
  highlightId: string
  currentColor?: TextHighlightColor
  onChangeColor: (id: string, color: TextHighlightColor) => void
  onDelete: (id: string) => void
}

function HighlightEditToolbar({
  highlightId,
  currentColor,
  onChangeColor,
  onDelete,
}: HighlightEditToolbarProps) {
  const mark = document.querySelector(`mark[data-highlight-id="${CSS.escape(highlightId)}"]`)
  if (!mark) return null

  const rect = mark.getBoundingClientRect()

  return (
    <div
      className="highlight-edit-toolbar fixed flex items-center gap-1.5 rounded-lg border border-border bg-popover px-2 py-1.5 shadow-lg"
      style={{
        left: rect.left + rect.width / 2,
        top: rect.top - 8,
        transform: 'translate(-50%, -100%)',
        zIndex: 9997,
      }}
    >
      {HIGHLIGHT_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          className={`h-5 w-5 rounded-full border transition-transform hover:scale-125 focus:outline-none focus:ring-2 focus:ring-ring ${COLOR_SWATCH_CLASSES[color]} ${
            color === currentColor
              ? 'border-foreground/50 scale-110'
              : 'border-black/10 dark:border-white/10'
          }`}
          title={`Change to ${color}`}
          onClick={() => onChangeColor(highlightId, color)}
        />
      ))}
      <div className="mx-0.5 h-4 w-px bg-border" />
      <button
        type="button"
        className="flex items-center justify-center h-5 w-5 rounded-full text-muted-foreground/60 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors"
        title="Remove highlight"
        onClick={() => onDelete(highlightId)}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <line x1="2" y1="2" x2="8" y2="8" />
          <line x1="8" y1="2" x2="2" y2="8" />
        </svg>
      </button>
    </div>
  )
}
