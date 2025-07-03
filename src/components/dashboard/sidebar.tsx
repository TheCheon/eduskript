'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { FileText, BookOpen, Settings, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

const navigation = [
  { name: 'Overview', href: '/dashboard', icon: FileText },
  { name: 'Scripts', href: '/dashboard/scripts', icon: BookOpen },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div className={cn(
      "bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 min-h-screen transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      <div className="p-4">
        {/* Toggle Button */}
        <div className="flex justify-end mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* New Script Button */}
        <Link href="/dashboard/scripts/new">
          <div className={cn(
            "flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg mb-6 cursor-pointer transition-all",
            isCollapsed ? "justify-center" : ""
          )}>
            <Plus size={16} />
            {!isCollapsed && <span>New Script</span>}
          </div>
        </Link>
        
        {/* Navigation */}
        <nav className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors',
                  isActive
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
                  isCollapsed ? 'justify-center' : ''
                )}
                title={isCollapsed ? item.name : undefined}
              >
                <Icon size={16} />
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
