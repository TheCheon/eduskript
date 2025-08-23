'use client'

import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { useState, useEffect } from 'react'
import { ContentLibrary } from './content-library'
import { PageBuilder } from './page-builder'
import { Card, CardContent } from '@/components/ui/card'
import { BookOpen, FileText } from 'lucide-react'

interface PageItem {
  id: string
  type: 'collection' | 'skript'
  title: string
  description?: string
  order: number
  slug?: string
  collectionSlug?: string // For skripts
  parentId?: string // For nested skripts under collections
  skripts?: PageItem[] // For collections containing skripts
  isInLayout?: boolean // For skripts: whether they're explicitly in the page layout
  permissions?: {
    canEdit: boolean
    canView: boolean
  }
}

interface DragData {
  type: 'collection' | 'skript'
  id: string
  title: string
  description?: string
}

export function PageBuilderInterface() {
  const [pageItems, setPageItems] = useState<PageItem[]>([])
  const [activeItem, setActiveItem] = useState<DragData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedCollections, setExpandedCollections] = useState<string[]>([])

  // Load existing page layout on component mount
  useEffect(() => {
    const loadPageLayout = async () => {
      try {
        const response = await fetch('/api/page-layout')
        if (response.ok) {
          const data = await response.json()
          if (data.data?.items) {
            // Separate collections and skripts
            const collections = data.data.items.filter((item: { type: string }) => item.type === 'collection')
            const skripts = data.data.items.filter((item: { type: string }) => item.type === 'skript')
            
            // Fetch collection details with their skripts from junction table
            const collectionsWithSkripts = await Promise.all(
              collections.map(async (item: { contentId: string; order: number }) => {
                try {
                  const contentResponse = await fetch(`/api/collections/${item.contentId}`)
                  if (contentResponse.ok) {
                    const contentData = await contentResponse.json()
                    const collection = contentData.data || contentData
                    
                    // Get skripts from the junction table (CollectionSkript)
                    const collectionSkripts = (collection.collectionSkripts || [])
                      .filter((cs: { skript: { isPublished: boolean } }) => cs.skript.isPublished) // Only published skripts
                      .map((cs: { skript: { id: string; title: string; description?: string; slug: string; isPublished: boolean }, order: number }) => {
                        return {
                          id: cs.skript.id,
                          type: 'skript' as const,
                          title: cs.skript.title || `skript ${cs.skript.id}`,
                          description: cs.skript.description,
                          order: cs.order, // Use order from junction table
                          slug: cs.skript.slug,
                          collectionSlug: collection.slug,
                          parentId: item.contentId,
                          permissions: contentData.permissions || { canEdit: false, canView: true }, // Use collection permissions for nested skripts
                          isInLayout: true // All skripts in CollectionSkript are part of the layout
                        }
                      })
                    
                    return {
                      id: item.contentId,
                      type: 'collection' as const,
                      title: collection.title || contentData.title || `collection ${item.contentId}`,
                      description: collection.description || contentData.description,
                      order: item.order,
                      slug: collection.slug || contentData.slug,
                      permissions: contentData.permissions,
                      skripts: collectionSkripts.sort((a: { order: number }, b: { order: number }) => a.order - b.order)
                    }
                  }
                } catch (error) {
                  console.error(`Error fetching collection details:`, error)
                }
                
                return {
                  id: item.contentId,
                  type: 'collection' as const,
                  title: `collection ${item.contentId}`,
                  order: item.order,
                  skripts: []
                }
              })
            )
            
            // Fetch root-level skripts from junction table (collectionId = null, userId = currentUser)
            // For now, we'll use the skripts from page layout that aren't in collections
            // TODO: Later we should fetch actual root-level skripts from CollectionSkript with collectionId = null
            const rootSkripts = await Promise.all(
              skripts.map(async (item: { contentId: string; order: number }) => {
                try {
                  const contentResponse = await fetch(`/api/skripts/${item.contentId}`)
                  if (contentResponse.ok) {
                    const contentData = await contentResponse.json()
                    const skript = contentData.data || contentData
                    
                    // Check if this skript is already included in a collection above
                    const isInCollection = collectionsWithSkripts.some(c => 
                      c.skripts?.some((s: PageItem) => s.id === item.contentId)
                    )
                    
                    if (!isInCollection) {
                      return {
                        id: item.contentId,
                        type: 'skript' as const,
                        title: skript.title || contentData.title || `skript ${item.contentId}`,
                        description: skript.description || contentData.description,
                        order: item.order,
                        slug: skript.slug || contentData.slug,
                        permissions: contentData.permissions
                      }
                    }
                  }
                } catch (error) {
                  console.error(`Error fetching skript details:`, error)
                }
                return null
              })
            )
            
            const validRootSkripts = rootSkripts.filter(s => s !== null)
            
            // Combine collections and root skripts
            const allItems = [...collectionsWithSkripts, ...validRootSkripts]
              .sort((a, b) => a.order - b.order)
            
            setPageItems(allItems)
            
            // Auto-expand collections that have skripts
            const collectionsToExpand = allItems
              .filter(item => item.type === 'collection' && item.skripts && item.skripts.length > 0)
              .map(item => item.id)
            setExpandedCollections(collectionsToExpand)
          }
        }
      } catch (error) {
        console.error('Error loading page layout:', error)
      } finally {
        setLoading(false)
      }
    }

    loadPageLayout()
  }, [])

  const handleDragStart = (event: DragStartEvent) => {
    const dragData = event.active.data.current as DragData
    setActiveItem(dragData)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    
    setActiveItem(null)
    
    const { active, over } = event
    
    if (!over) return

    // Handle adding new items from content library to root level
    if (over.id === 'page-builder' && active.data.current) {
      const dragData = active.data.current as DragData
      
      
      // Check if item is already in the page
      if (pageItems.some(item => item.id === dragData.id && item.type === dragData.type)) {
        console.log('Item already exists in page')
        return
      }

      const newItem: PageItem = {
        id: dragData.id,
        type: dragData.type,
        title: dragData.title,
        description: dragData.description,
        order: pageItems.length
      }

      console.log('Adding new item:', newItem)
      const updated = [...pageItems, newItem]
      setPageItems(updated)
      
      // Save to backend
      handleItemsChange(updated)
      return
    }

    // Parse IDs to understand the context (root items vs nested items)
    const activeId = active.id.toString()
    const overId = over.id.toString()
    
    // Handle complex drag and drop operations
    let updatedItems = [...pageItems]
    let hasChanges = false

    // Helper function to find an item and its location
    const findItemLocation = (itemId: string) => {
      // Handle compound IDs (collection-skript format)
      const realItemId = itemId.includes('-') ? itemId.split('-').pop()! : itemId

      // Check root level items  
      const rootIndex = updatedItems.findIndex(item => item.id === realItemId)
      if (rootIndex !== -1) {
        return { 
          item: updatedItems[rootIndex], 
          location: 'root' as const,
          collectionIndex: rootIndex,
          skriptIndex: -1
        }
      }

      // Check nested items in collections
      for (let collectionIndex = 0; collectionIndex < updatedItems.length; collectionIndex++) {
        const collection = updatedItems[collectionIndex]
        if (collection.skripts) {
          const skriptIndex = collection.skripts.findIndex(skript => skript.id === realItemId)
          if (skriptIndex !== -1) {
            return { 
              item: collection.skripts[skriptIndex], 
              location: 'nested' as const,
              collectionIndex,
              skriptIndex
            }
          }
        }
      }

      return null
    }

    const activeInfo = findItemLocation(activeId)
    
    if (!activeInfo) {
      console.log('Could not find active item:', activeId)
      return
    }

    console.log('Dragging:', activeInfo.item.title, 'from:', activeInfo.location)

    // Determine the drop target and handle different drop scenarios
    if (overId === 'page-builder') {
      // DROP TO ROOT LEVEL
      console.log('Dropping to root level')
      
      if (activeInfo.location === 'nested') {
        // Move skript from collection to root
        const sourceCollection = updatedItems[activeInfo.collectionIndex]
        const skriptToMove = sourceCollection.skripts![activeInfo.skriptIndex]
        
        // Remove from collection
        sourceCollection.skripts!.splice(activeInfo.skriptIndex, 1)
        
        // Add to root with proper order
        const newRootItem = {
          ...skriptToMove,
          order: updatedItems.length,
          parentId: undefined
        }
        
        updatedItems.push(newRootItem)
        hasChanges = true
        
        console.log('Moved skript to root:', skriptToMove.title)
      } else {
        console.log('Item is already at root level')
      }
      
    } else if (overId.startsWith('collection-')) {
      // DROP INTO COLLECTION
      const targetCollectionId = overId.replace('collection-', '')
      const targetCollectionIndex = updatedItems.findIndex(item => item.id === targetCollectionId)
      
      if (targetCollectionIndex === -1) {
        console.log('Target collection not found:', targetCollectionId)
        return
      }
      
      const targetCollection = updatedItems[targetCollectionIndex]
      console.log('Dropping into collection:', targetCollection.title)
      
      // Check if user has permission to edit the target collection
      if (!targetCollection.permissions?.canEdit) {
        console.log('No permission to edit target collection:', targetCollection.title)
        return
      }
      
      if (activeInfo.location === 'root') {
        // Move root item into collection
        const itemToMove = activeInfo.item
        
        if (itemToMove.type === 'skript') {
          // Remove from root
          updatedItems.splice(activeInfo.collectionIndex, 1)
          
          // Add to target collection
          if (!targetCollection.skripts) {
            targetCollection.skripts = []
          }
          
          const newNestedItem = {
            ...itemToMove,
            order: targetCollection.skripts.length,
            parentId: targetCollectionId
          }
          
          targetCollection.skripts.push(newNestedItem)
          hasChanges = true
          
          console.log('Moved root skript into collection:', itemToMove.title)
        } else {
          console.log('Cannot move collection into collection')
        }
        
      } else if (activeInfo.location === 'nested') {
        // Move skript from one collection to another
        const sourceCollection = updatedItems[activeInfo.collectionIndex]
        const skriptToMove = sourceCollection.skripts![activeInfo.skriptIndex]
        
        if (activeInfo.collectionIndex !== targetCollectionIndex) {
          // Remove from source collection
          sourceCollection.skripts!.splice(activeInfo.skriptIndex, 1)
          
          // Add to target collection
          if (!targetCollection.skripts) {
            targetCollection.skripts = []
          }
          
          const newNestedItem = {
            ...skriptToMove,
            order: targetCollection.skripts.length,
            parentId: targetCollectionId
          }
          
          targetCollection.skripts.push(newNestedItem)
          hasChanges = true
          
          console.log('Moved skript between collections:', skriptToMove.title)
        } else {
          console.log('Skript is already in this collection')
        }
      }
      
    } else {
      // REORDERING WITHIN SAME CONTEXT
      const overInfo = findItemLocation(overId)
      
      if (!overInfo) {
        console.log('Could not find drop target:', overId)
        return
      }
      
      // Only allow reordering within the same context
      if (activeInfo.location === overInfo.location) {
        if (activeInfo.location === 'root') {
          // Reorder root level items
          const oldIndex = activeInfo.collectionIndex
          const newIndex = overInfo.collectionIndex
          
          if (oldIndex !== newIndex) {
            updatedItems = arrayMove(updatedItems, oldIndex, newIndex)
              .map((item, index) => ({ ...item, order: index }))
            hasChanges = true
            
            console.log('Reordered root items')
          }
          
        } else if (activeInfo.location === 'nested' && 
                   activeInfo.collectionIndex === overInfo.collectionIndex) {
          // Reorder within same collection
          const collection = updatedItems[activeInfo.collectionIndex]
          const oldIndex = activeInfo.skriptIndex
          const newIndex = overInfo.skriptIndex
          
          if (oldIndex !== newIndex && collection.skripts) {
            collection.skripts = arrayMove(collection.skripts, oldIndex, newIndex)
              .map((item, index) => ({ ...item, order: index }))
            hasChanges = true
            
            console.log('Reordered within collection')
          }
        }
      }
    }

    // Update order numbers for all items
    if (hasChanges) {
      // Fix root level orders
      let rootOrder = 0
      updatedItems.forEach(item => {
        if (!item.parentId) {
          item.order = rootOrder++
        }
      })
      
      // Fix collection skript orders and track move operations
      const moveOperations: Array<{ skriptId: string; targetCollectionId?: string; order: number }> = []
      
      updatedItems.forEach(collection => {
        if (collection.skripts) {
          collection.skripts.forEach((skript, index) => {
            const newOrder = index
            
            // Find the original skript to get its old order and collection
            const originalCollection = pageItems.find(item => 
              item.type === 'collection' && item.skripts?.some(s => s.id === skript.id)
            )
            const originalSkript = originalCollection?.skripts?.find(s => s.id === skript.id)
            const originalOrder = originalSkript?.order ?? -1
            const originalCollectionId = originalCollection?.id
            
            // Check if collection assignment or order has changed
            const collectionChanged = originalCollectionId !== collection.id
            const orderChanged = originalOrder !== newOrder
            
            console.log(`Skript ${skript.id} (${skript.title}):`, {
              originalCollectionId,
              newCollectionId: collection.id,
              originalOrder,
              newOrder,
              collectionChanged,
              orderChanged,
              'originalSkript found': !!originalSkript,
              'originalCollection found': !!originalCollection
            })
            
            if (collectionChanged || orderChanged) {
              // Skript moved to a different collection or reordered within collection
              console.log(`Adding move operation for skript ${skript.id}`)
              moveOperations.push({
                skriptId: skript.id,
                targetCollectionId: collection.id,
                order: newOrder
              })
            }
            
            // Update the skript order after comparison
            skript.order = newOrder
          })
        }
      })
      
      // Check for skripts moved to root level
      updatedItems.forEach(item => {
        if (item.type === 'skript' && !item.parentId) {
          // Check if this was previously in a collection
          const wasInCollection = pageItems.some(pageItem => 
            pageItem.type === 'collection' && pageItem.skripts?.some(s => s.id === item.id)
          )
          
          if (wasInCollection) {
            moveOperations.push({
              skriptId: item.id,
              targetCollectionId: undefined, // Moving to root level
              order: item.order
            })
          }
        }
      })
      
      setPageItems(updatedItems)
      handleItemsChange(updatedItems, moveOperations.length > 0 ? moveOperations : undefined)
      console.log('Updated page items successfully', { moveOperations })
    }
  }

  const handleItemsChange = async (items: PageItem[], moveOperations?: Array<{ skriptId: string; targetCollectionId?: string; order: number }>) => {
    setPageItems(items)
    
    try {
      // Handle skript moves
      if (moveOperations && moveOperations.length > 0) {
        console.log('Processing move operations:', moveOperations)
        
        // Group operations by type
        const collectionReorders = new Map<string, string[]>() // collectionId -> ordered skript IDs
        const crossCollectionMoves: typeof moveOperations = []
        const rootLevelMoves: typeof moveOperations = []
        
        // Categorize move operations
        for (const move of moveOperations) {
          // Find the original collection for this skript
          const originalCollection = pageItems.find(item => 
            item.type === 'collection' && item.skripts?.some(s => s.id === move.skriptId)
          )
          
          if (move.targetCollectionId && move.targetCollectionId === originalCollection?.id) {
            // Same collection reorder - use bulk collection API
            if (!collectionReorders.has(move.targetCollectionId)) {
              // Get the full ordered list for this collection from the updated items
              const targetCollection = items.find(item => item.id === move.targetCollectionId)
              if (targetCollection?.skripts) {
                const orderedSkriptIds = targetCollection.skripts
                  .sort((a, b) => a.order - b.order)
                  .map(s => s.id)
                collectionReorders.set(move.targetCollectionId, orderedSkriptIds)
              }
            }
          } else if (move.targetCollectionId && move.targetCollectionId !== originalCollection?.id) {
            // Cross-collection move - use individual move API
            crossCollectionMoves.push(move)
          } else {
            // Root level move - use individual move API
            rootLevelMoves.push(move)
          }
        }
        
        // Process collection reorders using bulk API
        for (const [collectionId, skriptIds] of collectionReorders) {
          console.log(`Reordering collection ${collectionId}:`, skriptIds)
          try {
            const response = await fetch(`/api/collections/${collectionId}/reorder-skripts`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                skriptIds: skriptIds
              }),
            })
            
            console.log(`Collection reorder response status: ${response.status}`)
            
            if (!response.ok) {
              const errorText = await response.text()
              console.error(`Failed to reorder collection skripts (${response.status}):`, errorText)
              return // Don't continue if reorder fails
            } else {
              const responseData = await response.json()
              console.log(`Collection reorder succeeded:`, responseData)
            }
          } catch (error) {
            console.error(`Network error reordering collection ${collectionId}:`, error)
            return // Don't continue if network fails
          }
        }
        
        // Process individual moves using move API
        const individualMoves = [...crossCollectionMoves, ...rootLevelMoves]
        for (const move of individualMoves) {
          console.log('Individual move:', move)
          try {
            const response = await fetch('/api/skripts/move', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                skriptId: move.skriptId,
                targetCollectionId: move.targetCollectionId,
                order: move.order
              }),
            })
            
            console.log(`Individual move response status: ${response.status}`)
            
            if (!response.ok) {
              const errorText = await response.text()
              console.error(`Failed to move skript (${response.status}):`, errorText)
              return // Don't continue if moves fail
            } else {
              const responseData = await response.json()
              console.log(`Individual move succeeded:`, responseData)
            }
          } catch (error) {
            console.error(`Network error moving skript:`, error)
            return // Don't continue if network fails
          }
        }
      }

      // Prepare page layout items (only top-level items: collections and root skripts)
      const pageLayoutItems: Array<{ id: string; type: string; order: number }> = []
      
      items.forEach((item, index) => {
        if (item.type === 'collection') {
          // Add the collection itself
          pageLayoutItems.push({
            id: item.id,
            type: item.type,
            order: index
          })
        } else if (!item.parentId) {
          // Root-level skript (not nested in any collection)
          pageLayoutItems.push({
            id: item.id,
            type: item.type,
            order: index
          })
        }
        // Skip nested skripts - they're handled by collection membership
      })
      
      // Save page layout
      console.log('Saving page layout with items:', pageLayoutItems)
      try {
        const response = await fetch('/api/page-layout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ items: pageLayoutItems }),
        })
        
        console.log(`Page layout response status: ${response.status}`)
        
        if (response.ok) {
          const responseData = await response.json()
          console.log('Page layout saved successfully:', responseData)
        } else {
          const errorText = await response.text()
          console.error(`Failed to save page layout (${response.status}):`, errorText)
        }
      } catch (error) {
        console.error('Network error saving page layout:', error)
      }
    } catch (error) {
      console.error('Error saving page layout:', error)
    }
  }

  const handlePreview = () => {
    // Navigate to preview page or open in new tab
    console.log('Opening preview with items:', pageItems)
    // Could use router.push to a preview route
  }

  if (loading) {
    return (
      <div className="flex gap-6 h-[calc(100vh-120px)]">
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Loading page builder...</p>
        </div>
        <div className="w-80 flex-shrink-0">
          <ContentLibrary />
        </div>
      </div>
    )
  }

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-6 h-[calc(100vh-120px)]">
        {/* Page Builder - Left Side */}
        <div className="flex-1">
          <PageBuilder
            items={pageItems}
            onItemsChange={handleItemsChange}
            onPreview={handlePreview}
            expandedCollections={expandedCollections}
            onToggleCollection={(collectionId) => {
              setExpandedCollections(prev => 
                prev.includes(collectionId)
                  ? prev.filter(id => id !== collectionId)
                  : [...prev, collectionId]
              )
            }}
          />
        </div>

        {/* Content Library - Right Side */}
        <div className="w-80 flex-shrink-0">
          <ContentLibrary />
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeItem ? (
          <DragPreview item={activeItem} />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

interface DragPreviewProps {
  item: DragData
}

function DragPreview({ item }: DragPreviewProps) {
  const Icon = item.type === 'collection' ? BookOpen : FileText

  return (
    <Card className="w-64 opacity-90 rotate-2 shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Icon className="w-5 h-5 mt-0.5 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate">{item.title}</h3>
            {item.description && (
              <p className="text-xs text-muted-foreground truncate mt-1">
                {item.description}
              </p>
            )}
            <span className="text-xs text-muted-foreground capitalize mt-1 block">
              {item.type}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}