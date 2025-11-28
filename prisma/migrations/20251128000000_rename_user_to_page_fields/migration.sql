-- Rename user fields to page-centric naming
-- Use DO blocks to handle cases where columns may already be renamed

-- Rename username -> pageSlug (if username exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'username') THEN
        ALTER TABLE "users" RENAME COLUMN "username" TO "pageSlug";
    END IF;
END $$;

-- Rename webpageDescription -> pageDescription (if webpageDescription exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'webpageDescription') THEN
        ALTER TABLE "users" RENAME COLUMN "webpageDescription" TO "pageDescription";
    END IF;
END $$;

-- Add new pageName field if it doesn't exist
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pageName" TEXT;

-- Add pageIcon field for custom page branding if it doesn't exist
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pageIcon" TEXT;
