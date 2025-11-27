// Export/Import format types for content migration

export interface EduskriptExport {
  version: '1.0'
  exportedAt: string
  exportedBy?: string
  collections: ExportCollection[]
}

export interface ExportCollection {
  title: string
  description?: string
  slug: string
  isPublished: boolean
  skripts: ExportSkript[]
}

export interface ExportSkript {
  title: string
  description?: string
  slug: string
  isPublished: boolean
  order: number
  pages: ExportPage[]
  files?: ExportFile[]
}

export interface ExportPage {
  title: string
  slug: string
  content: string
  order: number
  isPublished: boolean
}

export interface ExportFile {
  name: string
  path: string // Relative path in hierarchy (e.g., "images/diagram.png")
  contentType?: string
  size?: number
  hash?: string
  // For import: base64 encoded data (for files under 10MB)
  data?: string
}

// Import result types
export interface ImportResult {
  success: boolean
  collectionsCreated: number
  skriptsCreated: number
  pagesCreated: number
  filesCreated: number
  errors: string[]
  warnings: string[]
}
