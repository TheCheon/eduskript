'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertDialogModal } from '@/components/ui/alert-dialog-modal'
import { useAlertDialog } from '@/hooks/use-alert-dialog'
import { Download, Upload, Loader2, FileArchive, AlertTriangle, CheckCircle, Package } from 'lucide-react'

interface ImportPreview {
  collections: { slug: string; title: string; isNew: boolean }[]
  skripts: { slug: string; title: string; pageCount: number; isNew: boolean }[]
  attachments: number
  errors: { type: 'error' | 'warning'; location: string; message: string }[]
}

export function ImportExportSettings() {
  const [isExporting, setIsExporting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const alert = useAlertDialog()

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const response = await fetch('/api/export')

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Export failed')
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition')
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
      const filename = filenameMatch?.[1] || 'eduskript-export.zip'

      // Download the file
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
      alert.showError(error instanceof Error ? error.message : 'Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setUploadedFile(file)
    setPreview(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/import?action=preview', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to process file')
      }

      const previewData = await response.json()
      setPreview(previewData)
    } catch (error) {
      console.error('Upload error:', error)
      alert.showError(error instanceof Error ? error.message : 'Failed to process file')
      setUploadedFile(null)
    } finally {
      setIsUploading(false)
    }
  }

  const handleImport = async () => {
    if (!uploadedFile) return

    setIsImporting(true)

    try {
      const formData = new FormData()
      formData.append('file', uploadedFile)

      const response = await fetch('/api/import?action=import', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Import failed')
      }

      alert.showSuccess(
        `Successfully imported ${result.imported.collections} collections, ` +
        `${result.imported.skripts} skripts, ${result.imported.pages} pages, ` +
        `and ${result.imported.files} files.`
      )

      // Reset state
      setPreview(null)
      setUploadedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('Import error:', error)
      alert.showError(error instanceof Error ? error.message : 'Import failed')
    } finally {
      setIsImporting(false)
    }
  }

  const handleCancelImport = () => {
    setPreview(null)
    setUploadedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const hasBlockingErrors = preview?.errors.some(e => e.type === 'error') ?? false

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          <CardTitle>Import / Export</CardTitle>
        </div>
        <CardDescription>
          Export your content as a zip file or import from another Eduskript instance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Export Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Export Content</h3>
          <p className="text-sm text-muted-foreground">
            Download all your collections, skripts, pages, and attachments as a zip file.
          </p>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            variant="outline"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export All Content
              </>
            )}
          </Button>
        </div>

        <div className="border-t pt-6">
          {/* Import Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Import Content</h3>
            <p className="text-sm text-muted-foreground">
              Upload a zip file exported from Eduskript to import content. Existing content with the same slug will be skipped.
            </p>

            {!preview && (
              <div className="flex items-center gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="import-file"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  variant="outline"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Select File
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Preview */}
            {preview && (
              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <FileArchive className="w-5 h-5" />
                  <span className="font-medium">{uploadedFile?.name}</span>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Collections:</span>{' '}
                    <span className="font-medium">{preview.collections.length}</span>
                    {preview.collections.filter(c => c.isNew).length > 0 && (
                      <span className="text-green-600 ml-1">
                        ({preview.collections.filter(c => c.isNew).length} new)
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Skripts:</span>{' '}
                    <span className="font-medium">{preview.skripts.length}</span>
                    {preview.skripts.filter(s => s.isNew).length > 0 && (
                      <span className="text-green-600 ml-1">
                        ({preview.skripts.filter(s => s.isNew).length} new)
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Pages:</span>{' '}
                    <span className="font-medium">
                      {preview.skripts.reduce((sum, s) => sum + s.pageCount, 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Attachments:</span>{' '}
                    <span className="font-medium">{preview.attachments}</span>
                  </div>
                </div>

                {/* Skript List */}
                {preview.skripts.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Skripts to import:</h4>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {preview.skripts.map(skript => (
                        <div
                          key={skript.slug}
                          className="text-sm flex items-center gap-2 py-1 px-2 rounded bg-muted/50"
                        >
                          {skript.isNew ? (
                            <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                          ) : (
                            <span className="w-3.5 h-3.5 text-muted-foreground">-</span>
                          )}
                          <span className={skript.isNew ? '' : 'text-muted-foreground'}>
                            {skript.title}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({skript.pageCount} pages)
                          </span>
                          {!skript.isNew && (
                            <span className="text-xs text-muted-foreground ml-auto">exists</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Errors and Warnings */}
                {preview.errors.length > 0 && (
                  <div className="space-y-2">
                    {preview.errors.filter(e => e.type === 'error').length > 0 && (
                      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                        <div className="flex items-center gap-2 text-destructive font-medium text-sm mb-2">
                          <AlertTriangle className="w-4 h-4" />
                          Errors (must be fixed before import)
                        </div>
                        <ul className="text-sm space-y-1">
                          {preview.errors.filter(e => e.type === 'error').map((error, i) => (
                            <li key={i} className="text-destructive">
                              <span className="font-mono text-xs">{error.location}</span>: {error.message}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {preview.errors.filter(e => e.type === 'warning').length > 0 && (
                      <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                        <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 font-medium text-sm mb-2">
                          <AlertTriangle className="w-4 h-4" />
                          Warnings
                        </div>
                        <ul className="text-sm space-y-1">
                          {preview.errors.filter(e => e.type === 'warning').map((warning, i) => (
                            <li key={i} className="text-yellow-600 dark:text-yellow-400">
                              <span className="font-mono text-xs">{warning.location}</span>: {warning.message}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={handleImport}
                    disabled={isImporting || hasBlockingErrors}
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Import Content
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancelImport}
                    disabled={isImporting}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      <AlertDialogModal
        open={alert.open}
        onOpenChange={alert.setOpen}
        type={alert.type}
        title={alert.title}
        message={alert.message}
      />
    </Card>
  )
}
