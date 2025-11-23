import { visit } from 'unist-util-visit'
import type { Root, Element } from 'hast'

/**
 * Rehype plugin that adds data-text attribute to h1 elements
 * for the rainbow gradient effect
 */
export function rehypeColorTitle() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName === 'h1') {
        // Extract text content from the h1
        const textContent = extractTextContent(node)

        // Add data-text attribute for the CSS effect
        if (!node.properties) {
          node.properties = {}
        }
        node.properties['dataHeadingText'] = textContent

        // Add the color-title class
        const currentClass = node.properties.className
        if (Array.isArray(currentClass)) {
          if (!currentClass.includes('color-title')) {
            currentClass.push('color-title')
          }
        } else if (typeof currentClass === 'string') {
          if (!currentClass.includes('color-title')) {
            node.properties.className = `${currentClass} color-title`
          }
        } else {
          node.properties.className = 'color-title'
        }
      }
    })
  }
}

function extractTextContent(node: Element): string {
  let text = ''

  const extract = (n: any) => {
    if (n.type === 'text') {
      text += n.value
    } else if (n.children && Array.isArray(n.children)) {
      n.children.forEach(extract)
    }
  }

  extract(node)
  return text
}