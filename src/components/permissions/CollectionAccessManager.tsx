'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CollectionWithAuthors, UserPermissions } from '@/types'
import { PermissionManager } from './PermissionManager'
import { ShareContentModal } from './ShareContentModal'

interface CollectionAccessManagerProps {
  collection: CollectionWithAuthors
  userPermissions: UserPermissions
  currentUserId: string
  onPermissionChange?: () => void
}

interface User {
  id: string
  name: string | null
  email: string | null
  image: string | null
  title: string | null
}

interface UserPermission {
  user: User
  permission: 'author' | 'viewer'
}

interface Collaboration {
  id: string
  createdAt: string
  requester: {
    id: string
    name: string | null
    email: string | null
    image: string | null
  }
  receiver: {
    id: string
    name: string | null
    email: string | null
    image: string | null
  }
}

interface CollaboratorForSharing {
  id: string
  name: string | null
  email: string | null
  image: string | null
  hasCollectionAccess: boolean
  collectionPermission?: string
  skriptAccess: {
    skriptId: string
    skriptTitle: string
    permission: string
  }[]
}

export function CollectionAccessManager({ 
  collection, 
  userPermissions,
  currentUserId, 
  onPermissionChange 
}: CollectionAccessManagerProps) {
  const [permissions, setPermissions] = useState<UserPermission[]>([])
  const [showShareModal, setShowShareModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [collaborators, setCollaborators] = useState<CollaboratorForSharing[]>([])

  // Check if current user can manage access
  const canManageAccess = userPermissions.canManageAuthors

  const loadCollaborators = useCallback(async () => {
    try {
      const response = await fetch('/api/collaboration-requests')
      const data = await response.json()
      
      if (data.success && data.data.collaborations) {
        const collaborations: Collaboration[] = data.data.collaborations
        
        // Transform collaborations into collaborators with access information
        const collaboratorsData: CollaboratorForSharing[] = collaborations.map(collab => {
          // The collaborator is the other person (not current user)
          const collaborator = collab.requester.id === currentUserId ? collab.receiver : collab.requester
          
          // Check if this collaborator has access to the current collection
          const hasCollectionAccess = collection.authors.some(author => author.user.id === collaborator.id)
          const collectionAuthor = collection.authors.find(author => author.user.id === collaborator.id)
          
          // For now, we'll just track collection access. 
          // Individual skript access would need additional queries
          return {
            id: collaborator.id,
            name: collaborator.name,
            email: collaborator.email,
            image: collaborator.image,
            hasCollectionAccess,
            collectionPermission: collectionAuthor?.permission,
            skriptAccess: [] // We could enhance this later to check individual skript permissions
          }
        })
        
        setCollaborators(collaboratorsData)
      }
    } catch (error) {
      console.error('Error loading collaborators:', error)
    }
  }, [collection.authors, currentUserId])

  const loadPermissions = useCallback(async () => {
    setIsLoading(true)
    try {
      // Convert collection authors to UserPermission format
      const userPermissions: UserPermission[] = collection.authors.map(author => ({
        user: {
          id: author.user.id,
          name: author.user.name,
          email: author.user.email,
          image: author.user.image,
          title: author.user.title
        },
        permission: author.permission as 'author' | 'viewer'
      }))

      setPermissions(userPermissions)
      
      // Also load collaborators
      await loadCollaborators()
    } catch (error) {
      console.error('Error loading permissions:', error)
    }
    setIsLoading(false)
  }, [collection.authors, loadCollaborators])

  useEffect(() => {
    loadPermissions()
  }, [loadPermissions])

  const handlePermissionChange = async (userId: string, newPermission: 'author' | 'viewer') => {
    try {
      const response = await fetch(`/api/collections/${collection.id}/authors/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permission: newPermission })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update permission')
      }

      // Update the local permissions immediately
      setPermissions(prev => 
        prev.map(p => 
          p.user.id === userId 
            ? { ...p, permission: newPermission }
            : p
        )
      )
      
      // Notify parent if needed
      onPermissionChange?.()
    } catch (error) {
      console.error('Error updating permission:', error)
      throw error
    }
  }

  const handleRemoveUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/collections/${collection.id}/authors/${userId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to remove user')
      }

      // Remove the user from the local permissions list immediately
      setPermissions(prev => prev.filter(p => p.user.id !== userId))
      
      // Update collaborators to reflect the removal
      setCollaborators(prev => 
        prev.map(c => 
          c.id === userId 
            ? { ...c, hasCollectionAccess: false, collectionPermission: undefined }
            : c
        )
      )
      
      // Notify parent if needed
      onPermissionChange?.()
    } catch (error) {
      console.error('Error removing user:', error)
      throw error
    }
  }

  if (isLoading) {
    return <div className="text-center py-8">Loading permissions...</div>
  }

  return (
    <div className="space-y-4">
      {/* Permission Manager */}
      <PermissionManager
        title="Access Management"
        description={`Manage who can access "${collection.title}"`}
        contentId={collection.id}
        contentType="collection"
        currentUserId={currentUserId}
        permissions={permissions}
        onPermissionChange={handlePermissionChange}
        onRemoveUser={handleRemoveUser}
        canManageAccess={canManageAccess}
        onShareClick={() => setShowShareModal(true)}
      />

      {/* Share Content Modal */}
      {showShareModal && (
        <ShareContentModal
          collection={collection}
          collaborators={collaborators}
          onClose={() => setShowShareModal(false)}
          onShare={async (newUserId: string, permission: 'author' | 'viewer') => {
            // Find the collaborator that was just added
            const newCollaborator = collaborators.find(c => c.id === newUserId)
            if (newCollaborator) {
              // Add them to the permissions list immediately
              const newPermission: UserPermission = {
                user: {
                  id: newCollaborator.id,
                  name: newCollaborator.name,
                  email: newCollaborator.email,
                  image: newCollaborator.image,
                  title: null // collaborators don't have title in their type
                },
                permission
              }
              setPermissions(prev => [...prev, newPermission])
              
              // Update collaborators to reflect the new access
              setCollaborators(prev => 
                prev.map(c => 
                  c.id === newUserId 
                    ? { ...c, hasCollectionAccess: true, collectionPermission: permission }
                    : c
                )
              )
            }
            setShowShareModal(false)
          }}
        />
      )}
    </div>
  )
}