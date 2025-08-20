import { getServerSession } from 'next-auth'
import { notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TopicEditor } from '@/components/dashboard/topic-editor'

// Ensure the page is dynamic and not cached
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface TopicPageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function TopicPage({ params }: TopicPageProps) {
  const session = await getServerSession(authOptions)
  const { slug } = await params
  
  if (!session?.user?.id) {
    return null
  }

  const topic = await prisma.topic.findFirst({
    where: {
      slug: slug,
      authors: {
        some: {
          userId: session.user.id
        }
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

  if (!topic) {
    notFound()
  }

  return <TopicEditor topic={topic} />
}
