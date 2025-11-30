# DOM Morphing Plan for Flicker-Free Live Preview

## Problem

When markdown is updated in the live preview, React unmounts and remounts all components because MDX compilation creates a NEW component function each time. React sees different component types and does a full DOM replacement, causing visual flicker and loss of interactive component state.

**Current behavior:**
1. User types in editor
2. MDX compiles → creates new `MDXContent` component function
3. React sees different component type → full unmount/remount
4. All interactive components (CodeEditor, Tabs, Callouts) lose state
5. Visual flicker as DOM is destroyed and rebuilt

## Solution: DOM Morphing with React Portals

Instead of replacing the entire React tree on each update:
1. Render MDX to static HTML string (using `renderToStaticMarkup`)
2. Use `morphdom` to diff and patch only changed DOM elements
3. Mount interactive components (CodeEditor, Tabs, Callout, etc.) via React portals into the morphed DOM

This preserves:
- Existing DOM structure where content hasn't changed
- Interactive component state (form inputs, expanded callouts, code editor content)
- Scroll position naturally (morphdom doesn't move unchanged content)

## Implementation

### 1. Install morphdom

```bash
pnpm add morphdom
pnpm add -D @types/morphdom
```

### 2. Create Static Component Variants

File: `src/lib/mdx-static-components.tsx`

Create simplified versions of interactive components that render placeholder HTML:

```tsx
// Static placeholders for morphdom - these render skeleton HTML with data attributes
// React portals will replace these with interactive components after morphdom runs

export const staticComponents = {
  'code-editor': (props) => (
    <div
      data-component="code-editor"
      data-props={JSON.stringify(props)}
      className="code-editor-placeholder min-h-[200px] bg-muted/20 rounded"
    />
  ),
  'blockquote': BlockquoteStatic, // Handles callouts
  'tabs-container': TabsStatic,
  'question': QuestionStatic,
  // etc.
}
```

### 3. Modify MarkdownRenderer to Use Morphdom

File: `src/components/markdown/markdown-renderer.client.tsx`

```tsx
import morphdom from 'morphdom'
import { renderToStaticMarkup } from 'react-dom/server'
import { createPortal } from 'react-dom'
import { staticComponents } from '@/lib/mdx-static-components'

function MarkdownRendererInner({ content, ... }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const portalsRef = useRef<Map<string, { element: Element; component: ReactNode }>>()
  const [portals, setPortals] = useState<ReactNode[]>([])

  useEffect(() => {
    const processContent = async () => {
      // 1. Compile MDX
      const { default: MDXContent } = await compileMDX(content, ...)

      // 2. Render to static HTML with placeholder components
      const staticHtml = renderToStaticMarkup(
        <MDXContent components={staticComponents} />
      )

      // 3. Morph existing DOM to new structure
      if (containerRef.current) {
        morphdom(containerRef.current, `<div>${staticHtml}</div>`, {
          childrenOnly: true,
          onBeforeElUpdated(fromEl, toEl) {
            // Skip updating elements with matching data-component-id
            if (fromEl.getAttribute('data-component-id') ===
                toEl.getAttribute('data-component-id')) {
              return false // Keep existing element
            }
            return true
          }
        })

        // 4. Find placeholders and create portals for interactive components
        hydrateInteractiveComponents()
      }
    }
    processContent()
  }, [content, ...])

  // Render portals alongside static content
  return (
    <>
      <div ref={containerRef} className="markdown-content prose ..." />
      {portals}
    </>
  )
}
```

### 4. Hydration Strategy for Interactive Components

After morphdom patches the DOM, scan for placeholders and mount React components into them:

```tsx
function hydrateInteractiveComponents() {
  const newPortals: ReactNode[] = []

  // Find all placeholder elements
  const placeholders = containerRef.current.querySelectorAll('[data-component]')

  placeholders.forEach((el, idx) => {
    const componentType = el.getAttribute('data-component')
    const props = JSON.parse(el.getAttribute('data-props') || '{}')
    const id = el.getAttribute('data-component-id') || `${componentType}-${idx}`

    // Create React component based on type
    const Component = interactiveComponents[componentType]
    if (Component) {
      newPortals.push(
        createPortal(
          <Component key={id} {...props} />,
          el
        )
      )
    }
  })

  setPortals(newPortals)
}
```

### 5. Component ID Generation

Generate stable IDs for components based on their content/position:

```tsx
// In static components, generate deterministic IDs
function hashProps(props: unknown): string {
  return hashCode(JSON.stringify(props))
}

// code-editor placeholder
<div
  data-component="code-editor"
  data-component-id={`editor-${hashProps({language, code})}`}
  data-props={...}
/>
```

## File Changes Summary

| File | Change |
|------|--------|
| `package.json` | Add `morphdom` dependency |
| `src/lib/mdx-static-components.tsx` | NEW - Static component variants |
| `src/components/markdown/markdown-renderer.client.tsx` | Refactor to use morphdom + portals |
| `src/lib/mdx-components-factory.tsx` | Keep for server rendering, may split |

## Benefits

1. **No flicker** - DOM elements stay in place if content unchanged
2. **State preservation** - Interactive components keep their state via React portals
3. **Performance** - Only changed DOM nodes are updated
4. **Scroll preservation** - Natural (no scroll jumps from DOM replacement)

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| renderToStaticMarkup can't run in client | It can - it's isomorphic. Just imports from 'react-dom/server' |
| Event handlers lost after morph | Portals remount React components which re-attach handlers |
| Complex nested components | Test thoroughly with Tabs-in-Callout scenarios |
| Performance of double render | Static render is fast, measure and optimize if needed |

## Research Notes

**MDX Playground**: Does not solve this problem. Uses simple async compilation + state updates, accepting the remount behavior.

**react-live**: Uses a "fake mount" approach but doesn't preserve state across code changes. Their focus is on live code editing, not content preservation.

**react-markdown**: Previously solved this with HAST → React elements approach, but MDX's component model makes this incompatible.

## Status

**Not yet implemented** - Saved as future optimization idea.
