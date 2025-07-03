'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'

export function DashboardNav() {
  const { data: session } = useSession()

  return (
    <nav className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-xl font-bold text-gray-900 dark:text-white">
            EduGarden
          </Link>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Welcome back, {session?.user?.name}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Button
            variant="outline"
            onClick={() => signOut()}
          >
            Sign Out
          </Button>
        </div>
      </div>
    </nav>
  )
}
