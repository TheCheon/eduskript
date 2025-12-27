'use client'

import { useMemo } from 'react'

interface InlineMarkdownProps {
  children: string
  className?: string
}

/**
 * Renders inline markdown with support for links.
 * Supports: [text](url) syntax
 *
 * Example: "Powered by [eduskript.org](https://eduskript.org)"
 */
export function InlineMarkdown({ children, className }: InlineMarkdownProps) {
  const parts = useMemo(() => {
    const result: (string | { text: string; url: string })[] = []
    // Match markdown links: [text](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
    let lastIndex = 0
    let match

    while ((match = linkRegex.exec(children)) !== null) {
      // Add text before the link
      if (match.index > lastIndex) {
        result.push(children.slice(lastIndex, match.index))
      }
      // Add the link
      result.push({ text: match[1], url: match[2] })
      lastIndex = match.index + match[0].length
    }

    // Add remaining text
    if (lastIndex < children.length) {
      result.push(children.slice(lastIndex))
    }

    return result
  }, [children])

  return (
    <span className={className}>
      {parts.map((part, i) =>
        typeof part === 'string' ? (
          part
        ) : (
          <a
            key={i}
            href={part.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {part.text}
          </a>
        )
      )}
    </span>
  )
}
