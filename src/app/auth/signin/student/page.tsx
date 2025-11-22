'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { SignInForm } from '@/components/auth/signin-form'

function StudentSignInContent() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

  return <SignInForm accountType="student" callbackUrl={callbackUrl} />
}

export default function StudentSignInPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <StudentSignInContent />
    </Suspense>
  )
}
