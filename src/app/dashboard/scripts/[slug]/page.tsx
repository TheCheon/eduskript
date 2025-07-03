import { getServerSession } from 'next-auth'
import { notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ScriptEditor } from '@/components/dashboard/script-editor'

// Ensure the page is dynamic and not cached
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface ScriptPageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function ScriptPage({ params }: ScriptPageProps) {
  const session = await getServerSession(authOptions)
  const { slug } = await params
  
  if (!session?.user?.id) {
    return null
  }

  const script = await prisma.script.findUnique({
    where: {
      authorId_slug: {
        authorId: session.user.id,
        slug: slug
      }
    },
    include: {
      chapters: {
        include: {
          pages: {
            orderBy: { order: 'asc' }
          }
        },
        orderBy: { order: 'asc' }
      }
    }
  })

  if (!script) {
    notFound()
  }

  return <ScriptEditor script={script} />
}
