'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { SignInForm } from '@/components/auth/signin-form'

function SignInContent() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  // Get account type from URL parameter, default to 'student'
  const accountType = (searchParams.get('type') as 'teacher' | 'student') || 'student'

  return <SignInForm accountType={accountType} callbackUrl={callbackUrl} />
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInContent />
    </Suspense>
  )
}
