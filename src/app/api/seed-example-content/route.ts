import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/seed-example-content - Create sample content for any new teacher
export async function POST() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Guard: only allow for teachers with no existing collections
  const existing = await prisma.collectionAuthor.findFirst({
    where: { userId: session.user.id },
  })

  if (existing) {
    return NextResponse.json(
      { error: 'You already have content. Seed is only available for new accounts.' },
      { status: 400 }
    )
  }

  try {
    const userId = session.user.id
    // Append last 8 chars of user ID to slugs for uniqueness
    const suffix = userId.slice(-8)

    // 1. Create collection
    const collection = await prisma.collection.create({
      data: {
        title: 'Getting Started with Eduskript',
        slug: `getting-started-${suffix}`,
        description: 'A quick tour of what you can do with Eduskript',
        authors: {
          create: { userId, permission: 'author' },
        },
      },
    })

    // 2. Create skript with 2 pages
    const skript = await prisma.skript.create({
      data: {
        title: 'Welcome to Eduskript',
        slug: `welcome-to-eduskript-${suffix}`,
        description: 'Your first skript — markdown, math, callouts, and interactive code',
        isPublished: true,
        authors: {
          create: { userId, permission: 'author' },
        },
      },
    })

    // 3. Link skript to collection
    await prisma.collectionSkript.create({
      data: {
        collectionId: collection.id,
        skriptId: skript.id,
        order: 0,
      },
    })

    // 4. Create Page 1: "Your First Page"
    await prisma.page.create({
      data: {
        title: 'Your First Page',
        slug: 'your-first-page',
        skriptId: skript.id,
        order: 0,
        isPublished: true,
        content: PAGE_1_CONTENT,
        authors: {
          create: { userId, permission: 'author' },
        },
      },
    })

    // 5. Create Page 2: "Interactive Features"
    await prisma.page.create({
      data: {
        title: 'Interactive Features',
        slug: 'interactive-features',
        skriptId: skript.id,
        order: 1,
        isPublished: true,
        content: PAGE_2_CONTENT,
        authors: {
          create: { userId, permission: 'author' },
        },
      },
    })

    // 6. Create page layout entry so the collection appears in the page builder
    const layout = await prisma.pageLayout.upsert({
      where: { userId },
      create: {
        userId,
        items: {
          create: {
            type: 'collection',
            contentId: collection.id,
            order: 0,
          },
        },
      },
      update: {
        items: {
          create: {
            type: 'collection',
            contentId: collection.id,
            order: 0,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        collectionId: collection.id,
        skriptId: skript.id,
        layoutId: layout.id,
      },
    })
  } catch (error) {
    console.error('Error seeding example content:', error)
    return NextResponse.json(
      { error: 'Failed to create example content' },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// Page content
// ---------------------------------------------------------------------------

const PAGE_1_CONTENT = `# Your First Page

Welcome to **Eduskript** — an education platform where you write content in Markdown and your students get a beautiful, interactive experience.

This page shows what's possible. Feel free to edit or delete it once you're comfortable.

---

> [!success]- Learning Goals
> By the end of this page you will know how to:
> - Format text with **bold**, *italic*, and \`inline code\`
> - Create headings, lists, and tables
> - Write math with LaTeX
> - Use callouts to highlight important information

## Text Formatting

Markdown gives you simple syntax for rich text:

| Syntax | Result |
|--------|--------|
| \`**bold**\` | **bold** |
| \`*italic*\` | *italic* |
| \`***both***\` | ***both*** |
| \`\\\`code\\\`\` | \`code\` |
| \`~~strikethrough~~\` | ~~strikethrough~~ |

## Lists

Bullet lists:

- First item
- Second item
  - Nested item
- Third item

Numbered lists:

1. Step one
2. Step two
3. Step three

## Blockquotes

> "The only way to learn mathematics is to do mathematics."
> — Paul Halmos

---

## Callouts

Callouts draw attention to key information. Eduskript supports many types:

> [!tip] Pro Tip
> You can make any callout **foldable** by adding \`-\` (folded) or \`+\` (open) after the type.

> [!warning] Watch Out
> Callout types include: \`note\`, \`tip\`, \`warning\`, \`success\`, \`info\`, \`question\`, \`example\`, \`quote\`, and many more.

## Math with LaTeX

Inline math uses single dollar signs: The famous equation $E = mc^2$ relates energy and mass.

Display math uses double dollar signs:

$$\\sum_{k=1}^{n} k = \\frac{n(n+1)}{2}$$

## Code Blocks

Static code blocks with syntax highlighting:

\`\`\`python
def factorial(n):
    """Calculate n! recursively."""
    if n <= 1:
        return 1
    return n * factorial(n - 1)

print(factorial(5))  # 120
\`\`\`

## Task List

Track progress with checkboxes:

- [x] Read this sample page
- [ ] Try the interactive features (next page)
- [ ] Create your own content
- [ ] Share it with students
`

const PAGE_2_CONTENT = `# Interactive Features

Eduskript goes beyond static content. This page demonstrates the interactive tools available to you and your students.

> [!abstract]+ What You'll See
> - A **Python** code editor students can run in the browser
> - A **JavaScript** code editor for web-oriented exercises
> - A sample quiz question

---

## Python Editor

Students can edit and run Python directly on the page. Try clicking **Run**:

\`\`\`python editor
# Calculate basic statistics
data = [4, 8, 15, 16, 23, 42]

mean = sum(data) / len(data)
variance = sum((x - mean) ** 2 for x in data) / len(data)
std_dev = variance ** 0.5

print(f"Data:     {data}")
print(f"Mean:     {mean:.2f}")
print(f"Variance: {variance:.2f}")
print(f"Std Dev:  {std_dev:.2f}")
\`\`\`

## JavaScript Editor

JavaScript editors work the same way:

\`\`\`javascript editor
// Array operations
const fruits = ["apple", "banana", "cherry", "date", "elderberry"];

// Map, filter, reduce
const lengths = fruits.map(f => f.length);
const longFruits = fruits.filter(f => f.length > 5);
const total = lengths.reduce((sum, n) => sum + n, 0);

console.log("Fruits:", fruits);
console.log("Lengths:", lengths);
console.log("Long names:", longFruits);
console.log("Total chars:", total);
\`\`\`

> [!example] More Languages
> Eduskript also supports **SQL editors** with real SQLite databases running in the browser. Upload a \`.db\` file and use \\\`\\\`\\\`sql editor db="mydata.db"\\\`\\\`\\\` to create an interactive SQL exercise.

---

## What's Next?

> [!info] Getting Started
> 1. Open the **Content Library** sidebar and explore your new collection
> 2. Click **Edit** on any page to modify it in the dashboard
> 3. Create a new collection or skript using the **+ New Collection** button
> 4. Visit your public page via the **Preview** button to see how students will experience it
>
> Happy teaching!
`
