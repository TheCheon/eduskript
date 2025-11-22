import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ProfileSettings } from '@/components/dashboard/profile-settings'
import { PageSettings } from '@/components/dashboard/page-settings'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return null
  }

  const isStudent = session.user.accountType === 'student'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          {isStudent ? 'Manage your account settings' : 'Manage your account and domain settings'}
        </p>
      </div>

      <div className="grid gap-6">
        <ProfileSettings />

        {/* Teacher-only settings */}
        {!isStudent && (
          <>
            <PageSettings />
          </>
        )}
      </div>
    </div>
  )
}
