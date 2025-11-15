'use client'

/**
 * Version Browser Component
 *
 * Displays version history for a component and allows users to restore versions.
 */

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useVersionHistory, useRestoreVersion } from '@/lib/userdata/hooks'
import type { VersionSummary } from '@/lib/userdata/types'
import { Clock, RotateCcw, Tag } from 'lucide-react'

interface VersionBrowserProps {
  pageId: string
  componentId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onRestore?: (versionNumber: number) => void
}

/**
 * Format bytes to human-readable size
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Math.round(bytes / Math.pow(k, i))} ${sizes[i]}`
}

/**
 * Format timestamp to relative time
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`

  const date = new Date(timestamp)
  return date.toLocaleDateString()
}

export function VersionBrowser({
  pageId,
  componentId,
  open,
  onOpenChange,
  onRestore,
}: VersionBrowserProps) {
  const { versions, isLoading, refresh } = useVersionHistory(pageId, componentId)
  const { restore, isRestoring } = useRestoreVersion(pageId, componentId)
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null)

  const handleRestore = async (version: VersionSummary) => {
    setSelectedVersion(version.versionNumber)
    try {
      await restore(version.versionNumber)
      if (onRestore) {
        onRestore(version.versionNumber)
      }
      await refresh() // Refresh version list
      onOpenChange(false) // Close dialog
    } catch (error) {
      console.error('Failed to restore version:', error)
    } finally {
      setSelectedVersion(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Version History</DialogTitle>
          <DialogDescription>
            Restore a previous version of your work. Recent versions are shown first.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-current" />
              <span className="ml-2">Loading versions...</span>
            </div>
          ) : versions.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <p>No version history available</p>
            </div>
          ) : (
            versions.map((version) => (
              <div
                key={version.versionNumber}
                className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        v{version.versionNumber}
                      </Badge>
                      {version.label && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          {version.label}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatRelativeTime(version.createdAt)}
                      </div>
                      <div>{formatBytes(version.sizeBytes)}</div>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!version.canRestore || isRestoring}
                    onClick={() => handleRestore(version)}
                    className="flex items-center gap-1"
                  >
                    {isRestoring && selectedVersion === version.versionNumber ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current" />
                        Restoring...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="h-3 w-3" />
                        Restore
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
