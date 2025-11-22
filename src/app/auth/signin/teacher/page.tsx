'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { SignInForm } from '@/components/auth/signin-form'

function TeacherSignInContent() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

  return <SignInForm accountType="teacher" callbackUrl={callbackUrl} />
}

export default function TeacherSignInPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TeacherSignInContent />
    </Suspense>
  )
}
