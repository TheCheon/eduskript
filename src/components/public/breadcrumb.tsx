'use client'

import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import { useEffect, useState } from 'react'

interface BreadcrumbItem {
  title: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  subdomain: string
  children?: React.ReactNode
  isOnSubdomain?: boolean
}

export function Breadcrumb({ items, subdomain, children, isOnSubdomain: initialIsOnSubdomain }: BreadcrumbProps) {
  const [isOnSubdomain, setIsOnSubdomain] = useState(initialIsOnSubdomain || false)

  useEffect(() => {
    // Only update if not provided from server
    if (initialIsOnSubdomain === undefined) {
      const hostname = window.location.hostname
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsOnSubdomain(hostname !== 'localhost' && hostname.endsWith('.localhost'))
    }
  }, [initialIsOnSubdomain])

  // Adjust URLs based on whether we're on a subdomain
  const adjustUrl = (url: string) => {
    if (!isOnSubdomain) return url
    
    // If on subdomain, remove the subdomain prefix from URLs
    const subdomainPrefix = `/${subdomain}`
    if (url.startsWith(subdomainPrefix)) {
      return url.substring(subdomainPrefix.length) || '/'
    }
    return url
  }

  const homeUrl = isOnSubdomain ? '/' : `/${subdomain}`

  return (
      <nav className="flex items-center justify-between mb-6 text-sm text-muted-foreground">
        <div className="flex items-center space-x-2">
          <Link
            href={homeUrl}
            className="flex items-center hover:text-foreground transition-colors"
          >
            <Home className="w-4 h-4" />
          </Link>

          {items.map((item, index) => (
            <div key={index} className="flex items-center space-x-2">
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              {item.href ? (
                <Link
                  href={adjustUrl(item.href)}
                  className="hover:text-foreground transition-colors"
                >
                  {item.title}
                </Link>
              ) : (
                <span className="text-foreground font-medium">
                  {item.title}
                </span>
              )}
            </div>
          ))}
        </div>
        
        {children && (
          <div>
            {children}
          </div>
        )}
      </nav>
  )
}
