/*
  Warnings:

  - You are about to drop the column `collectionId` on the `skripts` table. All the data in the column will be lost.
  - You are about to drop the column `order` on the `skripts` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "collection_skripts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "collectionId" TEXT,
    "skriptId" TEXT NOT NULL,
    "userId" TEXT,
    "order" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "collection_skripts_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collections" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "collection_skripts_skriptId_fkey" FOREIGN KEY ("skriptId") REFERENCES "skripts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "collection_skripts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "page_layouts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "page_layouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "page_layout_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "page_layout_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "page_layout_items_page_layout_id_fkey" FOREIGN KEY ("page_layout_id") REFERENCES "page_layouts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_skripts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_skripts" ("createdAt", "description", "id", "isPublished", "slug", "title", "updatedAt") SELECT "createdAt", "description", "id", "isPublished", "slug", "title", "updatedAt" FROM "skripts";
DROP TABLE "skripts";
ALTER TABLE "new_skripts" RENAME TO "skripts";
CREATE UNIQUE INDEX "skripts_slug_key" ON "skripts"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "collection_skripts_collectionId_skriptId_key" ON "collection_skripts"("collectionId", "skriptId");

-- CreateIndex
CREATE UNIQUE INDEX "collection_skripts_skriptId_userId_key" ON "collection_skripts"("skriptId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "page_layouts_user_id_key" ON "page_layouts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "page_layout_items_page_layout_id_content_id_type_key" ON "page_layout_items"("page_layout_id", "content_id", "type");
