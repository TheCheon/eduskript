import { visit } from 'unist-util-visit'
import type { Node } from 'unist'

interface ImageNode extends Node {
  type: 'image'
  url: string
  alt?: string
  title?: string
  data?: {
    hProperties?: Record<string, unknown>
  }
}

interface TextNode extends Node {
  type: 'text'
  value: string
}

/**
 * Remark plugin that parses image attributes like {width=50%}
 * and applies them as inline styles
 */
export function remarkImageAttributes() {
  return function transformer(tree: Node) {
    visit(tree, 'paragraph', (node: any) => {
      if (!node.children) return

      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i]

        // Look for image followed by text with attributes
        if (child.type === 'image' && i + 1 < node.children.length) {
          const nextChild = node.children[i + 1] as TextNode

          if (nextChild.type === 'text') {
            // Match {width=X%} pattern
            const attrMatch = nextChild.value.match(/^\{width=(\d+)%\}/)

            if (attrMatch) {
              const widthPercent = attrMatch[1]

              // Apply width as inline style
              child.data = child.data || {}
              child.data.hProperties = child.data.hProperties || {}
              child.data.hProperties.style = `width: ${widthPercent}%; height: auto;`

              // Remove the attribute text from the markdown
              nextChild.value = nextChild.value.replace(/^\{width=\d+%\}/, '').trim()

              // If the text node is now empty, remove it
              if (!nextChild.value) {
                node.children.splice(i + 1, 1)
              }
            }
          }
        }
      }
    })
  }
}
