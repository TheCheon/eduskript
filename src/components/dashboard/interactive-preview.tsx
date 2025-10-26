'use client'

import { useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { CodeBlockControl } from './code-block-control'
import { ImageResizeControl } from './image-resize-control'

interface InteractivePreviewProps {
  html: string
  onContentChange?: (newContent: string) => void
  originalMarkdown?: string
  fileList?: Array<{ id: string; name: string; url?: string; isDirectory?: boolean }>
}

export function InteractivePreview({ html, onContentChange, originalMarkdown, fileList }: InteractivePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rootsRef = useRef<Map<string, ReturnType<typeof createRoot>>>(new Map())
  const mountedIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!containerRef.current) return

    const currentIds = new Set<string>()
    let observerCleanup: (() => void) | null = null

    // Process immediately - no RAF delay to prevent layout shift
    const processInteractiveElements = () => {
      if (!containerRef.current) return

      console.log('[InteractivePreview] Processing elements, mounted IDs:', Array.from(mountedIdsRef.current))

      // Scan for code blocks and inject controls
      const codeBlockNodes = containerRef.current.querySelectorAll('[data-interactive="code-block"]')
      console.log('[InteractivePreview] Found code blocks:', codeBlockNodes.length)

      codeBlockNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return

        const id = node.getAttribute('data-block-id') || ''
        const language = node.getAttribute('data-lang') || 'text'
        const rootKey = `code-${id}`
        currentIds.add(rootKey)

        // Make the pre tag position relative and add padding for the control
        node.style.position = 'relative'
        node.style.paddingTop = '36px' // Add space for the dropdown

        // Check if control container still exists in the DOM
        const existingContainer = node.querySelector(`[data-control-id="${rootKey}"]`)

        // Only create new root if it doesn't exist or was removed from DOM
        if (!existingContainer) {
          // Clean up any stale root reference
          const oldRoot = rootsRef.current.get(rootKey)
          if (oldRoot) {
            try {
              oldRoot.unmount()
            } catch (e) {
              // Ignore unmount errors
            }
            rootsRef.current.delete(rootKey)
            mountedIdsRef.current.delete(rootKey)
          }

          // Create a container for the control
          const controlContainer = document.createElement('div')
          controlContainer.style.position = 'absolute'
          controlContainer.style.top = '6px'
          controlContainer.style.right = '8px'
          controlContainer.style.zIndex = '10'
          controlContainer.setAttribute('data-control-id', rootKey)

          // Add to the pre tag
          node.appendChild(controlContainer)

          // Create React root and render the control
          const root = createRoot(controlContainer)
          root.render(
            <CodeBlockControl
              language={language}
              onLanguageChange={(newLang) => handleLanguageChange(id, newLang)}
            />
          )

          rootsRef.current.set(rootKey, root)
          mountedIdsRef.current.add(rootKey)
        }
      })

      // Scan for images and inject resize controls
      const imageNodes = containerRef.current.querySelectorAll('[data-interactive="image"]')
      console.log('[InteractivePreview] Found images:', imageNodes.length)

      imageNodes.forEach((node) => {
        if (!(node instanceof HTMLImageElement)) return

        const id = node.getAttribute('data-image-id') || ''
        const imageSrc = node.getAttribute('data-image-src') || node.src
        const rootKey = `image-${id}`
        currentIds.add(rootKey)

        console.log('[InteractivePreview] Processing image:', { id, rootKey, alreadyMounted: mountedIdsRef.current.has(rootKey) })

        // Wrap image in a container if not already wrapped
        let wrapper = node.parentElement
        const needsNewWrapper = !wrapper || wrapper.classList.contains('prose-theme') || wrapper.tagName === 'P'

        if (needsNewWrapper) {
          wrapper = document.createElement('div')
          wrapper.style.position = 'relative'
          wrapper.style.display = 'inline-block'
          wrapper.style.maxWidth = '100%'
          wrapper.style.verticalAlign = 'top'
          wrapper.className = 'image-wrapper'
          node.parentElement?.insertBefore(wrapper, node)
          wrapper.appendChild(node)
        } else {
          wrapper.style.position = 'relative'
          wrapper.style.display = 'inline-block'
        }

        // Check if control container still exists in the DOM
        const existingContainer = wrapper.querySelector(`[data-control-id="${rootKey}"]`)

        // Only create new root if it doesn't exist or was removed from DOM
        if (!existingContainer) {
          // Clean up any stale root reference
          const oldRoot = rootsRef.current.get(rootKey)
          if (oldRoot) {
            try {
              oldRoot.unmount()
            } catch (e) {
              // Ignore unmount errors
            }
            rootsRef.current.delete(rootKey)
            mountedIdsRef.current.delete(rootKey)
          }

          // Create a container for the resize control - size it to match the image
          const controlContainer = document.createElement('div')
          controlContainer.setAttribute('data-control-id', rootKey)
          controlContainer.style.position = 'absolute'
          controlContainer.style.top = '0'
          controlContainer.style.left = '0'
          controlContainer.style.width = `${node.offsetWidth}px`
          controlContainer.style.height = `${node.offsetHeight}px`
          controlContainer.style.pointerEvents = 'none'
          wrapper.appendChild(controlContainer)

          // Create React root and render the control
          const root = createRoot(controlContainer)
          root.render(
            <ImageResizeControl
              imageElement={node}
              onWidthChange={(widthPercent) => handleImageResize(imageSrc, widthPercent)}
            />
          )

          rootsRef.current.set(rootKey, root)
          mountedIdsRef.current.add(rootKey)
        }
      })
    }

    // Process elements immediately
    processInteractiveElements()

    // Set up MutationObserver to watch for DOM changes and re-inject controls
    const observer = new MutationObserver((mutations) => {
      // Check if our control containers were removed
      let needsReprocess = false
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          // Check if any removed nodes contained our controls
          mutation.removedNodes.forEach((node) => {
            if (node instanceof Element) {
              if (node.querySelector('[data-control-id]') || node.matches('[data-control-id]')) {
                needsReprocess = true
              }
            }
          })
        }
      }

      if (needsReprocess) {
        console.log('[InteractivePreview] Controls removed, reprocessing...')
        // Clear tracking since DOM was replaced
        rootsRef.current.forEach((root) => {
          try {
            root.unmount()
          } catch (e) {
            // Ignore
          }
        })
        rootsRef.current.clear()
        mountedIdsRef.current.clear()

        // Reprocess after DOM settles
        requestAnimationFrame(() => {
          processInteractiveElements()
        })
      }
    })

    observer.observe(containerRef.current, {
      childList: true,
      subtree: true
    })

    observerCleanup = () => observer.disconnect()

    // Cleanup function
    return () => {
      if (observerCleanup) observerCleanup()

      // Unmount all roots
      rootsRef.current.forEach((root) => {
        try {
          root.unmount()
        } catch (e) {
          // Ignore unmount errors
        }
      })
      rootsRef.current.clear()
      mountedIdsRef.current.clear()
    }
  }, [html])

  const handleLanguageChange = (blockId: string, newLanguage: string) => {
    if (!onContentChange || !originalMarkdown) return

    // Find the code block in the markdown by counting blocks
    const blockIndex = parseInt(blockId.replace('code-block-', ''))

    // Match complete code blocks (opening ``` to closing ```)
    // This ensures we only match opening fences, not closing ones
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)\n```/g
    const matches = Array.from(originalMarkdown.matchAll(codeBlockRegex))

    if (matches[blockIndex]) {
      const match = matches[blockIndex]
      const start = match.index!
      const codeContent = match[2] // The code content

      // Replace just the opening fence with the new language
      const before = originalMarkdown.substring(0, start)
      const after = originalMarkdown.substring(start + match[0].length)
      const newMarkdown = `${before}\`\`\`${newLanguage}\n${codeContent}\n\`\`\`${after}`

      onContentChange(newMarkdown)
    }
  }

  const handleImageResize = (imageSrc: string, widthPercent: number) => {
    if (!onContentChange || !originalMarkdown) return

    console.log('[ImageResize] Starting resize', { imageSrc, widthPercent })

    // Extract the file ID from /api/files/{id}
    let originalFilename = imageSrc
    if (imageSrc.startsWith('/api/files/')) {
      const fileId = imageSrc.split('/').pop() || ''
      console.log('[ImageResize] File ID:', fileId)

      // Reverse-lookup the original filename from fileList
      if (fileList) {
        const file = fileList.find(f => f.id === fileId)
        if (file) {
          originalFilename = file.name
          console.log('[ImageResize] Found original filename:', originalFilename)
        } else {
          console.warn('[ImageResize] File not found in fileList:', fileId)
          return
        }
      } else {
        console.warn('[ImageResize] No fileList available for reverse lookup')
        return
      }
    } else {
      // Extract just the filename from the src (in case it has a full URL)
      originalFilename = imageSrc.split('/').pop() || imageSrc
      console.log('[ImageResize] Extracted filename:', originalFilename)
    }

    // Match markdown image syntax: ![alt](src) or ![alt](src){width=X%}
    // We need to find this specific image and add/update the width attribute
    const imageRegex = new RegExp(`!\\[([^\\]]*)\\]\\(([^\\)]*${originalFilename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\)]*)\\)(?:\\{[^}]*\\})?`, 'g')
    console.log('[ImageResize] Regex:', imageRegex)
    console.log('[ImageResize] Original markdown:', originalMarkdown)

    const newMarkdown = originalMarkdown.replace(imageRegex, (match, alt, src) => {
      console.log('[ImageResize] Match found:', { match, alt, src })
      // Add or update the width attribute
      return `![${alt}](${src}){width=${widthPercent}%}`
    })

    console.log('[ImageResize] New markdown:', newMarkdown)
    console.log('[ImageResize] Changed:', newMarkdown !== originalMarkdown)

    if (newMarkdown !== originalMarkdown) {
      onContentChange(newMarkdown)
    }
  }

  return (
    <div
      ref={containerRef}
      className="prose-theme"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
