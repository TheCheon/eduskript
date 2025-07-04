import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create a test teacher
  const hashedPassword = await bcrypt.hash('password123', 12)
  
  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@example.com' },
    update: {},
    create: {
      email: 'teacher@example.com',
      name: 'John Teacher',
      hashedPassword,
      subdomain: 'johnteacher',
      bio: 'Experienced mathematics teacher with a passion for making complex concepts simple.',
      title: 'Mathematics Professor'
    }
  })

  // Create a test script
  const script = await prisma.script.upsert({
    where: { 
      authorId_slug: {
        authorId: teacher.id,
        slug: 'algebra-basics'
      }
    },
    update: {},
    create: {
      title: 'Algebra Basics',
      description: 'Introduction to fundamental algebra concepts',
      slug: 'algebra-basics',
      isPublished: true,
      authorId: teacher.id
    }
  })

  // Create test chapters
  const chapter1 = await prisma.chapter.upsert({
    where: {
      scriptId_slug: {
        scriptId: script.id,
        slug: 'introduction'
      }
    },
    update: {},
    create: {
      title: 'Introduction to Variables',
      description: 'Understanding what variables are and how to use them',
      slug: 'introduction',
      order: 1,
      isPublished: true,
      authorId: teacher.id,
      scriptId: script.id
    }
  })

  const chapter2 = await prisma.chapter.upsert({
    where: {
      scriptId_slug: {
        scriptId: script.id,
        slug: 'solving-equations'
      }
    },
    update: {},
    create: {
      title: 'Solving Linear Equations',
      description: 'Step-by-step guide to solving linear equations',
      slug: 'solving-equations',
      order: 2,
      isPublished: true,
      authorId: teacher.id,
      scriptId: script.id
    }
  })

  // Create test pages
  await prisma.page.upsert({
    where: {
      chapterId_slug: {
        chapterId: chapter1.id,
        slug: 'what-are-variables'
      }
    },
    update: {},
    create: {
      title: 'What are Variables?',
      slug: 'what-are-variables',
      content: `# What are Variables?

A variable is a symbol that represents a number or value that can change. In algebra, we typically use letters like **x**, **y**, or **z** to represent variables.

## Examples

- If **x = 5**, then **x + 3 = 8**
- If **y = 10**, then **2y = 20**

## Key Points

1. Variables can represent any number
2. We use variables to write general mathematical expressions
3. The value of a variable can change depending on the problem

> **Remember:** A variable is like a container that holds a value!`,
      order: 1,
      isPublished: true,
      authorId: teacher.id,
      chapterId: chapter1.id
    }
  })

  await prisma.page.upsert({
    where: {
      chapterId_slug: {
        chapterId: chapter1.id,
        slug: 'using-variables'
      }
    },
    update: {},
    create: {
      title: 'Using Variables in Expressions',
      slug: 'using-variables',
      content: `# Using Variables in Expressions

Now that we know what variables are, let's learn how to use them in mathematical expressions.

## Simple Expressions

- **x + 5** means "some number plus 5"
- **2y** means "2 times some number"
- **z - 3** means "some number minus 3"

## Practice Examples

If **x = 7**, what is:
1. **x + 4** = ?
2. **3x** = ?
3. **x - 2** = ?

### Solutions:
1. **x + 4 = 7 + 4 = 11**
2. **3x = 3 × 7 = 21**
3. **x - 2 = 7 - 2 = 5**

Try solving these yourself before looking at the answers!`,
      order: 2,
      isPublished: true,
      authorId: teacher.id,
      chapterId: chapter1.id
    }
  })

  await prisma.page.upsert({
    where: {
      chapterId_slug: {
        chapterId: chapter2.id,
        slug: 'basic-equations'
      }
    },
    update: {},
    create: {
      title: 'Basic Linear Equations',
      slug: 'basic-equations',
      content: `# Basic Linear Equations

A linear equation is an equation where the variable appears only to the first power (no squares, cubes, etc.).

## Form of Linear Equations

The general form is: **ax + b = c**

Where:
- **a**, **b**, and **c** are numbers
- **x** is the variable we're solving for

## Examples

1. **x + 3 = 7**
2. **2x - 5 = 9**
3. **4x + 1 = 13**

## Steps to Solve

1. **Isolate the variable term** (get all x terms on one side)
2. **Isolate the variable** (get x by itself)
3. **Check your answer** (substitute back into the original equation)

Let's practice with these steps in the next section!`,
      order: 1,
      isPublished: true,
      authorId: teacher.id,
      chapterId: chapter2.id
    }
  })

  // Create a custom domain for testing
  await prisma.customDomain.upsert({
    where: { domain: 'math.example.com' },
    update: {},
    create: {
      domain: 'math.example.com',
      isActive: true,
      userId: teacher.id
    }
  })

  console.log('✅ Seed data created successfully!')
  console.log('👨‍🏫 Teacher:', teacher.email, '(subdomain: johnteacher)')
  console.log('📚 Script:', script.title)
  console.log('📖 Chapters created:', 2)
  console.log('📄 Pages created:', 3)
  console.log('🌐 Custom domain: math.example.com')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
