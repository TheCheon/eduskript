'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface ChapterRedirectProps {
  redirectUrl: string
}

export function ChapterRedirect({ redirectUrl }: ChapterRedirectProps) {
  const router = useRouter()

  useEffect(() => {
    router.push(redirectUrl)
  }, [router, redirectUrl])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting to first page...</p>
      </div>
    </div>
  )
} 