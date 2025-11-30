import { visit } from 'unist-util-visit'

/**
 * Rehype plugin to add source line position data to elements
 * Used for editor preview to highlight the paragraph corresponding to cursor position
 *
 * Adds data-source-line-start and data-source-line-end attributes based on
 * the markdown source position information preserved through the AST
 */
export function rehypeSourceLine() {
  return function transformer(tree: any) {
    // Block-level HTML elements
    const blockElements = new Set([
      'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'pre', 'blockquote', 'ul', 'ol', 'li',
      'table', 'div', 'section', 'article', 'figure', 'span',
      'code-editor', // Interactive code editor blocks
      'excalidraw-image', // Excalidraw drawings
      'muxvideo', // Video embeds
      'img' // Images (in case they're not wrapped)
    ])

    // MDX component names to track
    const mdxComponents = new Set([
      'Image', // MDX Image component
      'ExcalidrawImage',
      'MuxVideo',
      'CodeEditor'
    ])

    // Process HTML elements
    visit(tree, 'element', (node: any) => {
      if (!blockElements.has(node.tagName)) return
      addSourceLineAttributes(node)
    })

    // Process MDX JSX elements (for <Image>, etc.)
    visit(tree, 'mdxJsxFlowElement', (node: any) => {
      if (!mdxComponents.has(node.name)) return
      addSourceLineAttributesToMdx(node)
    })

    // Also check mdxJsxTextElement for inline MDX
    visit(tree, 'mdxJsxTextElement', (node: any) => {
      if (!mdxComponents.has(node.name)) return
      addSourceLineAttributesToMdx(node)
    })

    function addSourceLineAttributes(node: any) {
      // Try to get position from node itself
      let startLine = node.position?.start?.line
      let endLine = node.position?.end?.line

      // If this element doesn't have position, try to get it from first child
      if ((!startLine || !endLine) && node.children?.length > 0) {
        const firstChild = node.children[0]
        if (firstChild?.position?.start?.line && firstChild?.position?.end?.line) {
          startLine = firstChild.position.start.line
          endLine = firstChild.position.end.line
        }
      }

      // Skip if we still don't have position info
      if (!startLine || !endLine) return

      // Add source line attributes
      node.properties = node.properties || {}
      node.properties['data-source-line-start'] = startLine
      node.properties['data-source-line-end'] = endLine
    }

    function addSourceLineAttributesToMdx(node: any) {
      // Try to get position from node itself
      let startLine = node.position?.start?.line
      let endLine = node.position?.end?.line

      // Skip if we don't have position info
      if (!startLine || !endLine) return

      // MDX JSX elements use 'attributes' array instead of 'properties'
      node.attributes = node.attributes || []

      // Check if attributes already exist
      const hasStart = node.attributes.some((attr: any) => attr.name === 'data-source-line-start')
      const hasEnd = node.attributes.some((attr: any) => attr.name === 'data-source-line-end')

      if (!hasStart) {
        node.attributes.push({
          type: 'mdxJsxAttribute',
          name: 'data-source-line-start',
          value: String(startLine)
        })
      }
      if (!hasEnd) {
        node.attributes.push({
          type: 'mdxJsxAttribute',
          name: 'data-source-line-end',
          value: String(endLine)
        })
      }

    }
  }
}
