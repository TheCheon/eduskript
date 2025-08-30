'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Save, Loader2 } from 'lucide-react'

export function PageSettings() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [sidebarBehavior, setSidebarBehavior] = useState<string>('contextual')
  const [loading, setLoading] = useState(false)
  const [subdomainLoading, setSubdomainLoading] = useState(false)
  const [subdomain, setSubdomain] = useState(session?.user?.subdomain || '')

  // Load current preference on mount
  useEffect(() => {
    const loadPreference = async () => {
      try {
        const response = await fetch('/api/user/sidebar-preference')
        if (response.ok) {
          const data = await response.json()
          setSidebarBehavior(data.sidebarBehavior || 'contextual')
        }
      } catch (error) {
        console.error('Error loading sidebar preference:', error)
      }
    }
    
    if (session?.user) {
      loadPreference()
      setSubdomain(session.user.subdomain || '')
    }
  }, [session])

  const handleSidebarBehaviorChange = async (value: string) => {
    setSidebarBehavior(value)
    setLoading(true)

    try {
      const response = await fetch('/api/user/sidebar-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sidebarBehavior: value }),
      })

      if (response.ok) {
        // Simple success feedback - could use a toast library if available
        console.log('Sidebar preference updated successfully')
      } else {
        console.error('Failed to update preference')
        // Revert on error
        const data = await response.json()
        setSidebarBehavior(data.sidebarBehavior || 'contextual')
      }
    } catch (error) {
      console.error('Failed to update preference:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubdomainUpdate = async () => {
    setSubdomainLoading(true)

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain }),
      })

      if (response.ok) {
        await update() // Update session
        router.refresh() // Refresh page
        console.log('Subdomain updated successfully')
      } else {
        console.error('Failed to update subdomain')
      }
    } catch (error) {
      console.error('Failed to update subdomain:', error)
    } finally {
      setSubdomainLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Page Settings</CardTitle>
        <CardDescription>
          Customize how your public page appears to visitors
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Subdomain Section */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subdomain" className="text-sm font-medium">Subdomain</Label>
            <div className="flex items-center gap-2">
              <div className="flex items-center flex-1">
                <Input
                  id="subdomain"
                  type="text"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="rounded-r-none"
                  placeholder="your-subdomain"
                  pattern="^[a-z0-9-]+$"
                  required
                />
                <span className="px-3 py-2 bg-muted border border-l-0 border-input rounded-r-md text-muted-foreground text-sm h-10 flex items-center">
                  .{typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'localhost:3000' : 'eduskript.org'}
                </span>
              </div>
              <Button 
                onClick={handleSubdomainUpdate}
                disabled={subdomainLoading || subdomain === session?.user?.subdomain}
                size="sm"
                className="flex items-center gap-2"
              >
                {subdomainLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save
                  </>
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              This will be your public site URL. Only lowercase letters, numbers, and hyphens allowed.
            </p>
          </div>
        </div>

        {/* Sidebar Behavior Section */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">Sidebar Navigation Behavior</Label>
          
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <input
                type="radio"
                id="contextual"
                name="sidebarBehavior"
                value="contextual"
                checked={sidebarBehavior === 'contextual'}
                onChange={(e) => handleSidebarBehaviorChange(e.target.value)}
                disabled={loading}
                className="mt-1"
              />
              <div className="space-y-1">
                <Label htmlFor="contextual" className="font-normal cursor-pointer">
                  Contextual Navigation
                </Label>
                <p className="text-sm text-muted-foreground">
                  When viewing content inside a collection, only show that collection in the sidebar.
                  This provides a focused reading experience.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <input
                type="radio"
                id="full"
                name="sidebarBehavior"
                value="full"
                checked={sidebarBehavior === 'full'}
                onChange={(e) => handleSidebarBehaviorChange(e.target.value)}
                disabled={loading}
                className="mt-1"
              />
              <div className="space-y-1">
                <Label htmlFor="full" className="font-normal cursor-pointer">
                  Full Navigation
                </Label>
                <p className="text-sm text-muted-foreground">
                  Always show all collections in the sidebar, regardless of current page.
                  This allows quick navigation between all your content.
                </p>
              </div>
            </div>
          </div>
          
          {loading && (
            <div className="text-sm text-muted-foreground">
              Updating preference...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}