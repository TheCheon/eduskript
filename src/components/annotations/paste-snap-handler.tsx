'use client'

import { useEffect, useState } from 'react'
import type { Snap } from '@/types/snap'
import { SnapCropModal } from './snap-crop-modal'

interface PasteSnapHandlerProps {
  onCapture: (snap: Snap) => void
  nextSnapNumber: number
  // Returns {top, left} in paper-logical coordinates for the given snap display width
  getInsertPosition: (snapWidth: number) => { top: number; left: number }
}

export function PasteSnapHandler({ onCapture, nextSnapNumber, getInsertPosition }: PasteSnapHandlerProps) {
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null)

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile()
          if (blob) {
            e.preventDefault()
            setPendingBlob(blob)
            break
          }
        }
      }
    }
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [])

  const handleConfirm = (dataUrl: string, naturalW: number, naturalH: number) => {
    // Display size: cap at 400px wide, scale height proportionally
    const displayWidth = Math.min(400, naturalW)
    const displayHeight = Math.round(naturalH * (displayWidth / naturalW))

    const { top, left } = getInsertPosition(displayWidth)
    const snap: Snap = {
      id: Date.now().toString(),
      name: `snap${nextSnapNumber}`,
      imageUrl: dataUrl,
      top,
      left,
      width: displayWidth,
      height: displayHeight,
    }
    setPendingBlob(null)
    onCapture(snap)
  }

  if (!pendingBlob) return null

  return (
    <SnapCropModal
      blob={pendingBlob}
      onConfirm={handleConfirm}
      onCancel={() => setPendingBlob(null)}
    />
  )
}
