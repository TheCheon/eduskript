import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { generateSlug } from '@/lib/markdown'

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, subdomain } = await request.json()

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Check if subdomain is taken (if provided)
    if (subdomain) {
      const normalizedSubdomain = generateSlug(subdomain)
      const existingSubdomain = await prisma.user.findUnique({
        where: { subdomain: normalizedSubdomain }
      })

      if (existingSubdomain) {
        return NextResponse.json(
          { error: 'This subdomain is already taken' },
          { status: 400 }
        )
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        hashedPassword,
        subdomain: subdomain ? generateSlug(subdomain) : null,
      }
    })

    // Return success (without password)
    return NextResponse.json({
      message: 'User created successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        subdomain: user.subdomain,
      }
    })

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
