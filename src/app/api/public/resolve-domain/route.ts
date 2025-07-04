import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// API endpoint to resolve custom domains to subdomains
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const domain = searchParams.get('domain')

  if (!domain) {
    return NextResponse.json({ error: 'Domain parameter is required' }, { status: 400 })
  }

  try {
    // Check if domain is a custom domain
    const customDomain = await prisma.customDomain.findUnique({
      where: { 
        domain: domain,
        isActive: true 
      },
      include: { 
        user: {
          select: {
            subdomain: true
          }
        }
      }
    })

    if (customDomain?.user?.subdomain) {
      return NextResponse.json({ 
        subdomain: customDomain.user.subdomain,
        isCustomDomain: true 
      })
    }

    // If not a custom domain, check if it's a valid subdomain
    const user = await prisma.user.findUnique({
      where: { subdomain: domain },
      select: { subdomain: true }
    })

    if (user) {
      return NextResponse.json({ 
        subdomain: domain,
        isCustomDomain: false 
      })
    }

    return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
  } catch (error) {
    console.error('Error resolving domain:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
