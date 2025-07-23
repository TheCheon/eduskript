'use client'

import { useState } from 'react'
import { 
  File, 
  Image, 
  FileText, 
  Video, 
  Music, 
  Archive,
  Trash2
} from 'lucide-react'

interface FileItem {
  filename: string
  originalName?: string
  size: number
  url: string
  uploadType: 'global' | 'chapter'
  chapterId?: string
  uploadedAt: string
  extension?: string
}

interface FileBrowserProps {
  chapterId?: string
  onFileSelect?: (file: FileItem) => void
  className?: string
  onUploadComplete?: () => void
  files: FileItem[]
  loading: boolean
}

export function FileBrowser({ chapterId, onFileSelect, className = '', onUploadComplete, files, loading }: FileBrowserProps) {
  const [dragOver, setDragOver] = useState(false)

  const getFileIcon = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase()
    
    switch (extension) {
      case 'jpg': case 'jpeg': case 'png': case 'gif': case 'webp': case 'svg':
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        return <Image className="w-5 h-5 text-blue-500" />
      case 'mp4': case 'avi': case 'mov': case 'wmv':
        return <Video className="w-5 h-5 text-purple-500" />
      case 'mp3': case 'wav': case 'ogg': case 'flac':
        return <Music className="w-5 h-5 text-green-500" />
      case 'pdf': case 'doc': case 'docx': case 'txt': case 'md':
        return <FileText className="w-5 h-5 text-destructive" />
      case 'zip': case 'rar': case '7z': case 'tar':
        return <Archive className="w-5 h-5 text-yellow-500" />
      default:
        return <File className="w-5 h-5 text-icon-muted" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = async (e: React.DragEvent, uploadType: 'global' | 'chapter' = 'chapter') => {
    e.preventDefault()
    setDragOver(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    await uploadFiles(droppedFiles, uploadType)
  }

  const uploadFiles = async (fileList: File[], uploadType: 'global' | 'chapter' = 'chapter') => {
    const uploadPromises = fileList.map(async (file) => {
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('uploadType', uploadType)
        if (chapterId && uploadType === 'chapter') {
          formData.append('chapterId', chapterId)
        }

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (response.ok) {
          if (onUploadComplete) onUploadComplete()
        } else {
          const error = await response.json()
          console.error('Upload failed:', error.error)
        }
      } catch (error) {
        console.error('Upload error:', error)
      }
    })

    await Promise.all(uploadPromises)
  }

  const handleFileDragStart = (e: React.DragEvent, file: FileItem) => {
    // Set data for drag-and-drop to editor
    e.dataTransfer.setData('application/Eduskript-file', JSON.stringify(file))
    e.dataTransfer.effectAllowed = 'copy'
  }

  const handleFileDelete = async (file: FileItem) => {
    if (!window.confirm(`Are you sure you want to delete "${file.originalName || file.filename}"?`)) {
      return
    }

    try {
      const params = new URLSearchParams({
        uploadType: file.uploadType,
        ...(file.chapterId && { chapterId: file.chapterId })
      })

      const response = await fetch(`/api/upload/${file.filename}?${params}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // await loadFiles() // Refresh file list // This line is removed
        if (onUploadComplete) onUploadComplete()
      } else {
        const error = await response.json()
        console.error('Delete failed:', error.error)
      }
    } catch (error) {
      console.error('Delete error:', error)
    }
  }

  if (loading) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`p-4 space-y-4 ${className}`}>
      {/* Chapter Files Section */}
      {chapterId && (
        <div>
          <div
            className={`border-2 border-dashed rounded-lg p-3 transition-colors ${
              dragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'border-border'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'chapter')}
          >
            {files.filter(f => f.uploadType === 'chapter').length === 0 ? (
              <div className="text-center py-2 text-muted-foreground text-sm">
                No chapter files. Drop files here or click upload.
              </div>
            ) : (
              <div className="space-y-1">
                {files.filter(f => f.uploadType === 'chapter').map((file) => (
                  <div
                    key={file.url}
                    className="flex items-center space-x-2 p-2 rounded hover:bg-muted group"
                  >
                    <div
                      className="flex items-center space-x-2 flex-1 cursor-pointer"
                      draggable
                      onDragStart={(e) => handleFileDragStart(e, file)}
                      onClick={() => onFileSelect?.(file)}
                    >
                      {getFileIcon(file.filename)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {file.originalName || file.filename}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleFileDelete(file)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-destructive hover:text-destructive/80 transition-opacity"
                      title="Delete file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
