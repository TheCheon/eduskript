import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkAccounts() {
  const accounts = await prisma.account.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          accountType: true
        }
      }
    }
  })

  console.log(`Found ${accounts.length} OAuth accounts:`)
  accounts.forEach(acc => {
    console.log(`\n- Provider: ${acc.provider}`)
    console.log(`  Provider Account ID: ${acc.providerAccountId}`)
    console.log(`  User ID: ${acc.userId}`)
    console.log(`  User exists: ${acc.user ? 'YES' : 'NO (ORPHANED!)'}`)
    if (acc.user) {
      console.log(`  User: ${acc.user.name} (${acc.user.email || 'NO EMAIL'}) - ${acc.user.accountType}`)
    }
  })

  await prisma.$disconnect()
}

checkAccounts()
