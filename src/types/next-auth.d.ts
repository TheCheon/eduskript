 
import type NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      username?: string | null
      title?: string | null
      bio?: string | null
      isAdmin?: boolean
      requirePasswordReset?: boolean
      accountType?: string
      studentPseudonym?: string | null
      typographyPreference?: string | null
    }
  }

  interface User {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    username?: string | null
    title?: string | null
    bio?: string | null
    isAdmin?: boolean
    requirePasswordReset?: boolean
    accountType?: string
    studentPseudonym?: string | null
    typographyPreference?: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    username?: string | null
    title?: string | null
    bio?: string | null
    isAdmin?: boolean
    requirePasswordReset?: boolean
    accountType?: string
    studentPseudonym?: string | null
    typographyPreference?: string | null
  }
}
