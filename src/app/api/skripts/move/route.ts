import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { revalidatePath } from 'next/cache'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkSkriptPermissions, checkCollectionPermissions } from '@/lib/permissions'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { skriptId, targetCollectionId, order } = await request.json()

    if (!skriptId) {
      return NextResponse.json(
        { error: 'skriptId is required' },
        { status: 400 }
      )
    }

    // Get the skript with its current collection relationships and authors
    const skript = await prisma.skript.findUnique({
      where: { id: skriptId },
      include: {
        collectionSkripts: {
          include: {
            collection: {
              include: {
                authors: {
                  include: { user: true }
                }
              }
            }
          }
        },
        authors: {
          include: { user: true }
        }
      }
    })

    if (!skript) {
      return NextResponse.json(
        { error: 'Skript not found' },
        { status: 404 }
      )
    }

    // Check if user can edit this skript
    const skriptPermissions = checkSkriptPermissions(
      session.user.id, 
      skript.authors
    )

    // Check permissions on current collections (if any)
    let hasCurrentCollectionPermission = false
    if (skript.collectionSkripts.length > 0) {
      // Check if user has permission to edit any of the current collections
      for (const collectionSkript of skript.collectionSkripts) {
        const collectionPermissions = checkCollectionPermissions(
          session.user.id, 
          collectionSkript.collection.authors
        )
        if (collectionPermissions.canEdit) {
          hasCurrentCollectionPermission = true
          break
        }
      }
    }

    // Allow move if user has skript edit permissions OR collection edit permissions
    const canMoveSkript = skriptPermissions.canEdit || hasCurrentCollectionPermission

    if (!canMoveSkript) {
      return NextResponse.json(
        { error: 'You do not have permission to move this skript' },
        { status: 403 }
      )
    }

    // If moving to a specific collection, check permissions on target collection
    if (targetCollectionId) {
      const targetCollection = await prisma.collection.findUnique({
        where: { id: targetCollectionId },
        include: {
          authors: {
            include: { user: true }
          }
        }
      })

      if (!targetCollection) {
        return NextResponse.json(
          { error: 'Target collection not found' },
          { status: 404 }
        )
      }

      const targetPermissions = checkCollectionPermissions(
        session.user.id, 
        targetCollection.authors
      )

      if (!targetPermissions.canEdit) {
        return NextResponse.json(
          { error: 'You do not have permission to add skripts to the target collection' },
          { status: 403 }
        )
      }
    }

    // Handle the move operation with junction table management
    const result = await prisma.$transaction(async (tx) => {
      const newOrder = order || 0
      
      // Get current collection relationships
      const currentCollectionSkripts = await tx.collectionSkript.findMany({
        where: { skriptId: skriptId },
        include: { collection: true }
      })
      
      if (targetCollectionId) {
        // Moving to a specific collection
        
        // Check if skript is already in the target collection
        const existingInTarget = currentCollectionSkripts.find(cs => cs.collectionId === targetCollectionId)
        
        if (existingInTarget) {
          // Already in target collection, just reorder within it
          const currentOrder = existingInTarget.order
          
          if (currentOrder !== newOrder) {
            // Make room at new position
            await tx.collectionSkript.updateMany({
              where: {
                collectionId: targetCollectionId,
                order: { gte: newOrder }
              },
              data: {
                order: { increment: 1 }
              }
            })
            
            // Update the specific record
            await tx.collectionSkript.update({
              where: { id: existingInTarget.id },
              data: { order: newOrder }
            })
          }
        } else {
          // Moving to new collection
          
          // Remove from all current collections
          await tx.collectionSkript.deleteMany({
            where: { skriptId: skriptId }
          })
          
          // Make room in target collection
          await tx.collectionSkript.updateMany({
            where: {
              collectionId: targetCollectionId,
              order: { gte: newOrder }
            },
            data: {
              order: { increment: 1 }
            }
          })
          
          // Add to target collection
          await tx.collectionSkript.create({
            data: {
              collectionId: targetCollectionId,
              skriptId: skriptId,
              order: newOrder
            }
          })
        }
      } else {
        // Moving to root level (remove from all collections)
        
        // Remove from all collections
        await tx.collectionSkript.deleteMany({
          where: { skriptId: skriptId }
        })
        
        // For root level, we could create a record with collectionId = null and userId = session.user.id
        // But based on our schema design discussion, root placement is user-specific
        await tx.collectionSkript.create({
          data: {
            collectionId: null,
            skriptId: skriptId,
            userId: session.user.id,
            order: newOrder
          }
        })
      }
      
      // Return the updated skript with its new relationships
      const updatedSkript = await tx.skript.findUnique({
        where: { id: skriptId },
        include: {
          collectionSkripts: {
            include: {
              collection: true
            }
          }
        }
      })
      
      return updatedSkript
    })

    // Get user's subdomain for revalidation
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { subdomain: true }
    })

    if (user?.subdomain) {
      // Revalidate relevant paths
      revalidatePath(`/${user.subdomain}`)
      revalidatePath('/dashboard')
      
      // Revalidate old collection paths
      for (const cs of skript.collectionSkripts) {
        if (cs.collection) {
          revalidatePath(`/${user.subdomain}/${cs.collection.slug}`)
        }
      }
      
      // Revalidate new collection paths
      if (result) {
        for (const cs of result.collectionSkripts) {
          if (cs.collection) {
            revalidatePath(`/${user.subdomain}/${cs.collection.slug}`)
          }
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      data: result 
    })
  } catch (error) {
    console.error('Error moving skript:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}