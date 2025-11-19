'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertDialogModal } from '@/components/ui/alert-dialog-modal'
import { useAlertDialog } from '@/hooks/use-alert-dialog'
import { Users, BookOpen, Shield, AlertCircle, Check, X } from 'lucide-react'

interface IdentityRequest {
  id: string
  email: string
  requestedAt: string
  teacherEmail: string
}

interface StudentClass {
  id: string
  name: string
  description: string | null
  teacherName: string | null
  memberCount: number
  joinedAt: string
  identityRequests: IdentityRequest[]
}

export default function MyClassesPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [classes, setClasses] = useState<StudentClass[]>([])
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState<string | null>(null)
  const alert = useAlertDialog()

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/auth/signin')
      return
    }

    if (session.user?.accountType !== 'student') {
      router.push('/dashboard')
      return
    }

    loadClasses()
  }, [session, status, router])

  const loadClasses = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/classes/my-classes')

      if (!response.ok) {
        throw new Error('Failed to load classes')
      }

      const data = await response.json()
      setClasses(data.classes)
    } catch (error) {
      console.error('Error loading classes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRespondToRequest = async (requestId: string, approved: boolean) => {
    try {
      setResponding(requestId)

      const response = await fetch(`/api/identity-reveal-requests/${requestId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to respond')
      }

      // Reload classes to update the requests
      await loadClasses()

      if (approved) {
        alert.showSuccess('Identity revealed successfully. The teacher can now see your email address for this class.')
      }
    } catch (error) {
      console.error('Error responding to request:', error)
      alert.showError(error instanceof Error ? error.message : 'Failed to respond to request')
    } finally {
      setResponding(null)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-4xl mx-auto">
          <p>Loading your classes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">My Classes</h1>
          <p className="text-muted-foreground mt-1">
            Classes you&apos;re enrolled in
          </p>
        </div>

        {classes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No classes yet</h3>
              <p className="text-muted-foreground text-center">
                You haven&apos;t joined any classes. Ask your teacher for an invite link to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {classes.map((classItem) => (
              <Card key={classItem.id}>
                <CardHeader>
                  <CardTitle>{classItem.name}</CardTitle>
                  {classItem.description && (
                    <CardDescription>{classItem.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {classItem.teacherName && (
                      <div>Teacher: {classItem.teacherName}</div>
                    )}
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{classItem.memberCount} student{classItem.memberCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div>
                      Joined {new Date(classItem.joinedAt).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Identity Reveal Requests */}
                  {classItem.identityRequests.length > 0 && (
                    <div className="space-y-3 pt-4 border-t">
                      {classItem.identityRequests.map((request) => (
                        <div key={request.id} className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-lg p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Shield className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                                <h4 className="font-semibold text-sm">Privacy Request</h4>
                              </div>
                              <p className="text-sm text-muted-foreground mb-3">
                                Your teacher wants to identify you in this class. They provided the email <strong>{request.email}</strong> and are asking for your consent to link it to your account.
                              </p>
                              <p className="text-xs text-muted-foreground">
                                <AlertCircle className="w-3 h-3 inline mr-1" />
                                If you approve, the teacher will see your email address instead of your anonymous nickname.
                              </p>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRespondToRequest(request.id, false)}
                                disabled={responding === request.id}
                                className="gap-1"
                              >
                                <X className="w-4 h-4" />
                                Decline
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleRespondToRequest(request.id, true)}
                                disabled={responding === request.id}
                                className="gap-1"
                              >
                                {responding === request.id ? (
                                  'Processing...'
                                ) : (
                                  <>
                                    <Check className="w-4 h-4" />
                                    Approve
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        <AlertDialogModal
          open={alert.open}
          onOpenChange={alert.setOpen}
          type={alert.type}
          title={alert.title}
          message={alert.message}
        />
      </div>
    </div>
  )
}
