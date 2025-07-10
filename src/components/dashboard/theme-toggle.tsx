'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ThemeToggleProps {
  isCollapsed?: boolean
}

export function ThemeToggle({ isCollapsed = false }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const { data: session } = useSession()
  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoadedPreference, setHasLoadedPreference] = useState(false)

  // Only render after mounting to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const loadThemePreference = useCallback(async () => {
    if (!session?.user?.email || hasLoadedPreference || isLoading) return
    
    setIsLoading(true)
    try {
      const response = await fetch('/api/user/theme')
      if (response.ok) {
        const data = await response.json()
        // Only set theme if it's different and not already in sync
        if (data.themePreference && data.themePreference !== theme && data.themePreference !== resolvedTheme) {
          setTheme(data.themePreference)
        }
        setHasLoadedPreference(true)
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error)
    } finally {
      setIsLoading(false)
    }
  }, [session, theme, resolvedTheme, setTheme, hasLoadedPreference, isLoading])

  // Load user's theme preference when session is available
  useEffect(() => {
    if (session?.user?.email && mounted && !hasLoadedPreference) {
      loadThemePreference()
    }
  }, [session, mounted, loadThemePreference, hasLoadedPreference])

  const saveThemePreference = async (newTheme: string) => {
    if (!session?.user?.email) return
    
    try {
      await fetch('/api/user/theme', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: newTheme })
      })
    } catch (error) {
      console.error('Failed to save theme preference:', error)
    }
  }

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={`${isCollapsed ? 'w-10 h-10 p-0' : 'w-full justify-start'}`}
        disabled
      >
        <Sun className="w-5 h-5" />
        {!isCollapsed && <span className="ml-2">Theme</span>}
      </Button>
    )
  }

  const cycleTheme = async () => {
    if (isLoading) return
    
    // Use resolvedTheme for more accurate current state
    const currentTheme = resolvedTheme || 'light'
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark'
    
    // Temporarily disable transitions to prevent flicker
    document.documentElement.classList.add('theme-transitioning')
    
    // Set theme immediately for instant feedback
    setTheme(newTheme)
    
    // Re-enable transitions after a brief delay
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning')
    }, 100)
    
    // Save to database asynchronously
    if (session?.user?.email) {
      saveThemePreference(newTheme)
    }
  }

  const getThemeIcon = () => {
    return resolvedTheme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />
  }

  const getThemeLabel = () => {
    return resolvedTheme === 'dark' ? 'Dark' : 'Light'
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={cycleTheme}
      disabled={isLoading}
      className={`${isCollapsed ? 'w-10 h-10 p-0' : 'w-full justify-start'} transition-none`}
      title={isCollapsed ? `Theme: ${getThemeLabel()} (click to cycle)` : undefined}
    >
      {getThemeIcon()}
      {!isCollapsed && <span className="ml-2">Theme: {getThemeLabel()}</span>}
    </Button>
  )
}
