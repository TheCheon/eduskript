/**
 * Compression Utilities for Version History
 *
 * Provides gzip compression/decompression and SHA-256 hashing
 * for space-efficient version storage with deduplication.
 */

/**
 * Generate SHA-256 hash of data for deduplication
 * @param data - String data to hash
 * @returns Promise resolving to hex-encoded hash
 */
export async function generateSHA256(data: string): Promise<string> {
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)

  // Convert ArrayBuffer to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  return hashHex
}

/**
 * Compress data using gzip
 * @param data - String data to compress
 * @returns Promise resolving to compressed Blob
 */
export async function gzipCompress(data: string): Promise<Blob> {
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)

  // Use CompressionStream API (supported in modern browsers)
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(dataBuffer)
      controller.close()
    }
  })

  const compressedStream = stream.pipeThrough(new CompressionStream('gzip'))
  const compressedBlob = await new Response(compressedStream).blob()

  return compressedBlob
}

/**
 * Decompress gzip-compressed data
 * @param blob - Compressed Blob to decompress
 * @returns Promise resolving to decompressed string
 */
export async function gzipDecompress(blob: Blob): Promise<string> {
  // Use DecompressionStream API
  const decompressedStream = blob.stream().pipeThrough(new DecompressionStream('gzip'))
  const decompressedBlob = await new Response(decompressedStream).blob()

  // Convert blob to text
  const text = await decompressedBlob.text()

  return text
}

/**
 * Calculate uncompressed size in bytes
 * @param data - String data to measure
 * @returns Size in bytes (UTF-8 encoded)
 */
export function calculateSize(data: string): number {
  const encoder = new TextEncoder()
  return encoder.encode(data).length
}
