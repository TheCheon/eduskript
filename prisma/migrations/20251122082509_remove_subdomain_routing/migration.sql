-- DropForeignKey
ALTER TABLE "custom_domains" DROP CONSTRAINT "custom_domains_userId_fkey";

-- DropIndex
DROP INDEX "users_subdomain_key";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "subdomain",
ADD COLUMN     "username" TEXT;

-- DropTable
DROP TABLE "custom_domains";

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

