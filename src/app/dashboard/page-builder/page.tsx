import { PageBuilderInterface } from '@/components/dashboard/page-builder-interface'
import { AdminPageBuilderPlaceholder } from '@/components/dashboard/admin-page-builder-placeholder'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function PageBuilderPage() {
  const session = await getServerSession(authOptions)

  // Redirect students to their dashboard
  if (session?.user?.accountType === 'student') {
    redirect('/dashboard/my-classes')
  }

  // Platform admins don't have personal pages
  if (session?.user?.isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Page Builder</h1>
        </div>
        <AdminPageBuilderPlaceholder />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Page Builder
        </h1>
        <p className="text-muted-foreground mt-2">
          Build your personal page by dragging content from your library
        </p>
      </div>

      <PageBuilderInterface />
    </div>
  )
}