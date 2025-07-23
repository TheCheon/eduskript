import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// S3/Cellar client setup
import { S3Client } from '@aws-sdk/client-s3'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getS3Client() {
  const region = process.env.CELLAR_ADDON_REGION || 'us-east-1' // Cellar default
  return new S3Client({
    region,
    endpoint: `https://${process.env.CELLAR_ADDON_HOST}`,
    credentials: {
      accessKeyId: process.env.CELLAR_ADDON_KEY_ID!,
      secretAccessKey: process.env.CELLAR_ADDON_KEY_SECRET!,
    },
    forcePathStyle: false, // Cellar is S3-compatible
  })
}
