import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

interface BreadcrumbItem {
  title: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  subdomain: string
  children?: React.ReactNode
}

export function Breadcrumb({ items, subdomain, children }: BreadcrumbProps) {
  return (
      <nav className="flex items-center justify-between mb-6 text-sm text-muted-foreground">
        <div className="flex items-center space-x-2">
          <Link
            href={`/${subdomain}`}
            className="flex items-center hover:text-foreground transition-colors"
          >
            <Home className="w-4 h-4" />
          </Link>

          {items.map((item, index) => (
            <div key={index} className="flex items-center space-x-2">
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              {item.href ? (
                <Link
                  href={item.href}
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
