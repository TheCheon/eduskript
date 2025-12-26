'use client'

import { NotebookPen } from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface OrgIconProps {
  org: {
    showIcon?: boolean | null
    iconUrl?: string | null
    name?: string
  }
  className?: string
  size?: number
}

export function OrgIcon({ org, className, size = 24 }: OrgIconProps) {
  // If showIcon is explicitly false, render nothing
  if (org.showIcon === false) {
    return null
  }

  // If there's a custom icon URL, show it
  if (org.iconUrl) {
    return (
      <Image
        src={org.iconUrl}
        alt={org.name ? `${org.name} icon` : 'Organization icon'}
        width={size}
        height={size}
        className={cn('object-contain', className)}
      />
    )
  }

  // Default: show NotebookPen icon
  return (
    <NotebookPen
      className={className}
      style={{ width: size, height: size }}
    />
  )
}
