import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function deleteStudent() {
  const studentId = 'cmi6k6sq10000g3oaxauz7b4e'

  console.log('Deleting student and associated OAuth accounts...')

  // Delete OAuth accounts first
  await prisma.account.deleteMany({
    where: { userId: studentId }
  })
  console.log('✅ OAuth accounts deleted')

  // Delete sessions
  await prisma.session.deleteMany({
    where: { userId: studentId }
  })
  console.log('✅ Sessions deleted')

  // Delete user
  await prisma.user.delete({
    where: { id: studentId }
  })
  console.log('✅ Student deleted')

  await prisma.$disconnect()
}

deleteStudent().catch(err => {
  console.error('Error:', err)
  prisma.$disconnect()
})
