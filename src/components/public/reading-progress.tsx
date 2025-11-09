'use client'

import { useState, useEffect } from 'react'

export function ReadingProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const updateProgress = () => {
      // Find the article element (contains the actual content)
      const article = document.querySelector('article.prose-theme')
      if (!article) return

      // Get the article's position in screen space (after transform)
      const rect = article.getBoundingClientRect()

      // Calculate progress based on where the middle of the viewport is
      // relative to the article's content
      const viewportMiddle = window.innerHeight / 2
      const articleTop = rect.top
      const articleHeight = rect.height

      // Progress: 0% when viewport middle is at article top, 100% when at article bottom
      const scrollPercent = ((viewportMiddle - articleTop) / articleHeight) * 100

      // Clamp between 0 and 100
      const clampedProgress = Math.max(0, Math.min(100, scrollPercent))
      setProgress(clampedProgress)
    }

    // Update on animation frame for smooth updates during pan/zoom
    let rafId: number
    const animationLoop = () => {
      updateProgress()
      rafId = requestAnimationFrame(animationLoop)
    }
    rafId = requestAnimationFrame(animationLoop)

    return () => cancelAnimationFrame(rafId)
  }, [])

  return (
    <div className="fixed top-0 left-0 w-full h-1 bg-gray-200 dark:bg-gray-700 z-50">
      <div
        className="h-full bg-blue-500 transition-all duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}
